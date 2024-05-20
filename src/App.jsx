import { useEffect, useRef, useState, useCallback } from "react";
import { OCRClient } from "tesseract-wasm";
import CameraVideo from "./CameraVideo";
import { useLoadRecognitionModel } from './recognitionHook';

function isNormalOrientation(orientation) {
  return orientation.confidence > 0 && orientation.rotation === 0;
}

function formatOrientation(orientation) {
  if (orientation.confidence === 0) {
    return "Unknown";
  }
  return `${orientation.rotation}°`;
}

const OutputFormat = {
  TEXT: "TEXT",
  HOCR: "HOCR",
  DETECTION: "DETECTION",
};

const Status = {
  INITLISATION: "Fetching text recognition model",
  RECOGNITION: "Recognizing text",
  DETECTION: "Detecting text",
};

function App() {
  const ocrClientRef = useRef(null);
  const cancelledFlagRef = useRef(false);
  const [documentText, setDocumentText] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [orientation, setOrientation] = useState(null);
  const [ocrTime, setOCRTime] = useState(null);
  const [outputFormat, setOutputFormat] = useState(OutputFormat.DETECTION);
  const [rects, setRects] = useState([]);

  useEffect(() => {
    // Initialize the OCR engine when recognition is performed for the first
    // time.
    const client = new OCRClient();

    // Fetch OCR model. This demo fetches the model directly from GitHub,
    // but in production you should serve it yourself and make sure HTTP
    // compression and caching are applied to reduce loading time.
    setStatus(Status.INITLISATION);
    client
      .loadModel(
        "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata",
      )
      .then(() => (ocrClientRef.current = client));
    return () => {
      cancelledFlagRef.current = true;
    };
  }, []);

  // const recognize = useLoadRecognitionModel();

  const process = useCallback(async (sharpenedImage) => {
    if (!sharpenedImage || !ocrClientRef.current) {
      return;
    }
    setError(null);
    setOrientation(null);
    setOCRTime(null);

    cancelledFlagRef.current = false;

    const ocr = ocrClientRef.current;
    const startTime = performance.now();

    try {
      await ocr.loadImage(sharpenedImage);
      if (cancelledFlagRef.current) return;

      const orientation = await ocr.getOrientation();
      setOrientation(orientation);

      if (cancelledFlagRef.current) return;

      // Get the text as a single string. This will be quick since OCR has
      // already been performed.
      let text, boxes;
      switch (outputFormat) {
        case OutputFormat.HOCR:
          text = await ocr.getHOCR();
          setDocumentText(text);
          break;
        case OutputFormat.TEXT:
          text = await ocr.getText();
          setDocumentText(text);
          break;
        case OutputFormat.DETECTION: {
          boxes = await ocr.getBoundingBoxes("word");
          const imageWidth = sharpenedImage.width, imageHeight = sharpenedImage.height;
          boxes = boxes
            // .filter((box) => [0, 1, 2].includes(box?.flags))
            .map(box => box.rect)
            .filter(Boolean)
            .map(({ left, top, right, bottom }) => {
              const width = imageWidth - left - right;
              const height = imageHeight - top - bottom;
              if (width <= 0 || height <= 0) return null;
              return { left, top, width, height };
            })
            .filter(Boolean);
          if (boxes?.length) {
            setRects(boxes);
          } else {
            setRects([]);
          }
          break;
        }
      }
      const endTime = performance.now();
      setOCRTime(Math.round(endTime - startTime));
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setStatus(null);
    }
  }, [outputFormat]);

  return (
    <div className="app">
      <label hyml-for="outputformat-select">Choose output format:</label>
      <select
        name="outputFormat"
        id="outputformat-select"
        value={outputFormat}
        onChange={(ev) => setOutputFormat(ev.target.value)}
      >
        {Object.keys(OutputFormat).map((k) => (
          <option key={k} value={k}>
            {OutputFormat[k]}
          </option>
        ))}
      </select>
      <CameraVideo process={process} rects={rects} />
      <div style={{ height: "100px" }}></div>
      {error && (
        <div className="app__error">
          <b>Error:</b> {error.message}
        </div>
      )}
      {status !== null && <div>{status}…</div>}
      {ocrTime !== null && <div>{ocrTime}ms</div>}
      {orientation !== null &&
        !isNormalOrientation(orientation) &&
        `Orientation: ${formatOrientation(orientation)}`}
      {documentText && <pre className="app__text">{documentText}</pre>}
    </div>
  );
}

export default App;
