import { useEffect, useRef, useState, useCallback } from "react";
import CameraVideo from "./CameraVideo";
import { useLoadRecognitionModel } from './recognitionHook';
import { useOCRClient } from './useOCRSCliet';

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
  const [documentText, setDocumentText] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [outputFormat, setOutputFormat] = useState(OutputFormat.DETECTION);

  const recognize = useLoadRecognitionModel();
  const { detect } = useOCRClient();

  const process = useCallback(async (sharpenedImage, image) => {
    setError(null);
    const rects = detect(sharpenedImage);
    if (rects?.length) {
      const recognizedLines = await recognize(image, rects);
      if (recognizedLines?.length) {
        setDocumentText(recognizedLines.flat(2).map(line => line.word).join(' '));
      }
    } else {
      setDocumentText(null);
    }
  }, []);

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
      <CameraVideo recognize={process} />
      <div style={{ height: "100px" }}></div>
      {error && (
        <div className="app__error">
          <b>Error:</b> {error.message}
        </div>
      )}
      {status !== null && <div>{status}…</div>}
      {documentText && <pre className="app__text">{documentText}</pre>}
    </div>
  );
}

export default App;
