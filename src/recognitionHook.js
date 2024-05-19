import { getBackend } from "@tensorflow/tfjs";
import { useEffect, useRef, useCallback } from "react";
import { RECO_CONFIG, VOCAB, REC_MEAN, REC_STD } from "./modelConfig";
import {
  argMax,
  browser,
  concat,
  loadGraphModel,
  scalar,
  softmax,
  unstack,
} from "@tensorflow/tfjs";
import { chunk } from "underscore";

async function loadRecognitionModel (recognitionModel, recoConfig) {
  try {
    recognitionModel.current = await loadGraphModel(recoConfig.path);
  } catch (error) {
    console.error(error);
  } finally {
    console.log("tenqorflow current backend: " + getBackend());    
  }
}
/**
 * @param {HTMLImageElement} image
 * @param {Array<{ left: number, top: number, right: number, bottom: number }>} boxes 
*/
function getCrops (image, boxes) {
  const promises = [];
  for (const { left, top, width, height } of boxes) {
    if (width < 0 || height < 0) continue;
    const canvasEl = document.createElement("canvas");
    canvasEl.width = width;
    canvasEl.height = height;
    const ctx = canvasEl.getContext("2d");
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, left, top, width, height, 0, 0, width, height);
    const crop = new Image();
    const promise = new Promise((resolve) => {
      crop.onload = () => {
        resolve({ crop, width, height });
      };
      const cropSrc = canvasEl.toDataURL('image/png', 1.0);
      crop.src = cropSrc;
    });
    promises.push(promise);
  }
  return Promise.all(promises);
};

function getImageTensorForRecognitionModel (crops, size) {
  const list = crops.map(({ crop, width, height }) => {
    const h = height;
    const w = width;
    let resize_target;
    let padding_target;
    const aspect_ratio = size[1] / size[0];
    if (aspect_ratio * h > w) {
      resize_target = [size[0], Math.round((size[0] * w) / h)];
      padding_target = [
        [0, 0],
        [0, size[1] - Math.round((size[0] * w) / h)],
        [0, 0],
      ];
    } else {
      resize_target = [Math.round((size[1] * h) / w), size[1]];
      padding_target = [
        [0, size[0] - Math.round((size[1] * h) / w)],
        [0, 0],
        [0, 0],
      ];
    }
    return browser
      .fromPixels(crop)
      .resizeNearestNeighbor(resize_target)
      .pad(padding_target, 0)
      .toFloat()
      .expandDims();
  });
  const tensor = concat(list);
  const mean = scalar(255 * REC_MEAN);
  const std = scalar(255 * REC_STD);
  return tensor.sub(mean).div(std);
};

async function extractWordsFromCrop (recognitionModel, crops, size) {
  if (!recognitionModel) return;
  const tensor = getImageTensorForRecognitionModel(crops, size);
  const predictions = await recognitionModel.executeAsync(tensor);
  // @ts-ignore
  const probabilities = softmax(predictions, -1);
  const bestPath = unstack(argMax(probabilities, -1), 0);
  const blank = 126;
  const words = [];
  for (const sequence of bestPath) {
    let collapsed = "";
    let added = false;
    const values = sequence.dataSync();
    const arr = Array.from(values);
    for (const k of arr) {
      if (k === blank) {
        added = false;
      } else if (k !== blank && added === false) {
        collapsed += VOCAB[k];
        added = true;
      }
    }
    words.push(collapsed);
  }
  return words;
};

async function extractWords (recognitionModel, image, boxes, inputSize) {
  const crops = await getCrops(image, boxes);
  const chunks = chunk(crops, 32);
  const promises = chunks.map(chunk => {
    return extractWordsFromCrop(recognitionModel, chunk, inputSize)
      .then(words =>
        words?.map((word, index) => ({ word })
      )
    );
  });
  return await Promise.all(promises);
}

const RecoConfig = RECO_CONFIG.crnn_mobilenet_v3_small;

export function useLoadRecognitionModel () {
  const recognitionModelRef = useRef(null);
  useEffect(() => {
    loadRecognitionModel(recognitionModelRef, RecoConfig);
  }, []);

  const recognize = useCallback((image, boxes) => {
    const recognitionModel = recognitionModelRef.current;
    if (!recognitionModel || !image || !boxes?.length) return;
    const InputSize = [RecoConfig.height, RecoConfig.width];
    return extractWords(recognitionModel, image, boxes, InputSize);
  }, []);
  
  return recognize;
}

