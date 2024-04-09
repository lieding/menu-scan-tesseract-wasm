import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { OCRClient } from "tesseract-wasm";

import CameraVideo from './CameraVideo';

function ProgressBar({ value }) {
  return (
    <div className="ProgressBar">
      <div className="ProgressBar__bar" style={{ width: `${value}%` }} />
    </div>
  );
}

function OCRWordBox({ box, imageWidth, imageHeight }) {
  const [hover, setHover] = useState(false);

  const toPercent = (val) => `${val * 100}%`;
  const left = toPercent(box.rect.left / imageWidth);
  const width = toPercent((box.rect.right - box.rect.left) / imageWidth);
  const top = toPercent(box.rect.top / imageHeight);
  const height = toPercent((box.rect.bottom - box.rect.top) / imageHeight);

  return (
    <div
      className="OCRWordBox"
      style={{ position: "absolute", left, top, width, height }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={box.text}
    >
      {hover && (
        <div className="OCRWordBox__content">
          <div className="OCRWordBox__text">
            {box.text} ({box.confidence.toFixed(2)})
          </div>
        </div>
      )}
    </div>
  );
}

function isNormalOrientation(orientation) {
  return orientation.confidence > 0 && orientation.rotation === 0;
}

function formatOrientation(orientation) {
  if (orientation.confidence === 0) {
    return "Unknown";
  }
  return `${orientation.rotation}°`;
}

function OCRDemoApp() {
  const ocrClient = useRef(null);
  const [documentImage, setDocumentImage] = useState(null);
  const [documentText, setDocumentText] = useState(null);
  const [error, setError] = useState(null);
  const [ocrProgress, setOCRProgress] = useState(null);
  const [status, setStatus] = useState(null);
  const [orientation, setOrientation] = useState(null);
  const [ocrTime, setOCRTime] = useState(null);
  const [outputFormat, setOutputFormat] = useState("text");

  useEffect(() => {
    if (!documentImage) {
      return;
    }

    setError(null);
    setOrientation(null);
    setOCRTime(null);

    // Set progress to `0` rather than `null` here to show the progress bar
    // immediately after an image is selected.
    setOCRProgress(0);

    let cancelled = false;

    const doOCR = async () => {
      if (!ocrClient.current) {
        // Initialize the OCR engine when recognition is performed for the first
        // time.
        ocrClient.current = new OCRClient();

        // Fetch OCR model. This demo fetches the model directly from GitHub,
        // but in production you should serve it yourself and make sure HTTP
        // compression and caching are applied to reduce loading time.
        setStatus("Fetching text recognition model");
        await ocrClient.current.loadModel(
          "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata"
        );
      }
      const ocr = ocrClient.current;
      const startTime = performance.now();

      try {
        setStatus("Loading image");
        await ocr.loadImage(documentImage);
        if (cancelled) {
          return;
        }

        const orientation = await ocr.getOrientation();
        setOrientation(orientation);

        // Perform OCR and display progress.
        setStatus("Recognizing text");
        let boxes = await ocr.getTextBoxes("word", setOCRProgress);
        boxes = boxes.filter((box) => box.text.trim() !== "");

        if (cancelled) {
          return;
        }

        const endTime = performance.now();
        setOCRTime(Math.round(endTime - startTime));

        // Get the text as a single string. This will be quick since OCR has
        // already been performed.
        let text;
        switch (outputFormat) {
          case "hocr":
            text = await ocr.getHOCR();
            break;
          case "text":
            text = await ocr.getText();
            break;
        }

        if (cancelled) {
          return;
        }
        setDocumentText(text);
      } catch (err) {
        setError(err);
      } finally {
        setOCRProgress(null);
        setStatus(null);
      }
    };
    doOCR();

    return () => {
      cancelled = true;
    };
  }, [documentImage, outputFormat]);

  
  return (
    <div className="OCRDemoApp">
      <CameraVideo recognize={setDocumentImage} />
      {error && (
        <div className="OCRDemoApp__error">
          <b>Error:</b> {error.message}
        </div>
      )}
      {status !== null && <div>{status}…</div>}
      {ocrTime !== null && (
        <div>
          {ocrTime}ms
        </div>
      )}
      {ocrProgress !== null && <ProgressBar value={ocrProgress} />}
      {orientation !== null &&
        !isNormalOrientation(orientation) &&
        `Orientation: ${formatOrientation(orientation)}`}
      {documentText && <pre className="OCRDemoApp__text">{documentText}</pre>}
    </div>
  );
}

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<OCRDemoApp />);
