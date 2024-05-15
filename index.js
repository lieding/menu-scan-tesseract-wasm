import { createRoot } from "react-dom/client";
import OCRDemoApp from "./ocr-app";

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<OCRDemoApp />);
