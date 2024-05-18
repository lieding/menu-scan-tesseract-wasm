import { useRef, useCallback, useEffect } from 'react'
import {
  DetectedLine,
  OcrEngine,
  OcrEngineInit,
  TextLine,
  default as initOcrLib,
} from "./ocrs/ocrs.js";


let ocrResources;

/**
 * Create an OCR engine and configure its models.
 */
async function createOCREngine() {
  if (!ocrResources) {
    // Initialize OCR library and fetch models on first use.
    const init = async () => {
      const [ocrBin, detectionModel] = await Promise.all([
        fetch("/ocrs_bg.wasm").then((r) => r.arrayBuffer()),
        fetch("/text-detection.rten").then((r) => r.arrayBuffer()),
      ]);

      await initOcrLib(ocrBin);

      return {
        detectionModel: new Uint8Array(detectionModel),
      };
    };
    ocrResources = init();
  }

  const { detectionModel, /*recognitionModel*/ } = await ocrResources;
  const ocrInit = new OcrEngineInit();
  ocrInit.setDetectionModel(detectionModel);
  // ocrInit.setRecognitionModel(recognitionModel);
  return new OcrEngine(ocrInit);
}

export function useOCRClient() {
  const clientRef = useRef(null);
  useEffect(() => {
    createOCREngine().then((client) => (clientRef.current = client));
  }, []);

  const detect = useCallback((imageData) => {
    const ocrEngine = clientRef.current;
    if (!ocrEngine) return;
    let ocrInput;
    try {
      ocrInput = ocrEngine.loadImage(
        imageData.width,
        imageData.height,
        imageData.data,
      );
    } catch (error) {
      console.error(error);
      return null;
    }
    try {
      const detStart = performance.now();
      const lines = ocrEngine.detectText(ocrInput);
      const detEnd = performance.now();
      console.log((detEnd - detStart) + 'ms');
      return lines
        .map(line => Array.from(line.rotatedRect().boundingRect()))
        .filter(rect => rect.length === 4);
    } catch (error) {
      console.error(error);
      return null;
    }
  }, []);
  return { detect };
}