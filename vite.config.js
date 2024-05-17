import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { cpSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// List of files which tesseract-wasm expects to be served alongside the JS
// bundle, if using its default asset location settings.
const files = [
  "tesseract-core.wasm", // Main OCR engine module
  "tesseract-core-fallback.wasm", // Slower version for browsers without SIMD support
  "tesseract-worker.js", // JS entry point for the web worker
];

for (let file of files) {
  const rootDir = dirname(fileURLToPath(import.meta.url));
  cpSync(
    `${rootDir}/build/${file}`,
		`${rootDir}/node_modules/.vite/deps/${file}`
  );
}

export default defineConfig((configEnv) => {
	const isDevelopment = configEnv.mode === "development";

	return {
		plugins: [react()],
		server: {
			open: './src/index.html',
		},
		css: {
			modules: {
				generateScopedName: isDevelopment ? "[name]__[local]__[hash:base64:5]" : "[hash:base64:5]",
			},
		},
		build: {
			rollupOptions: {
				input: {
					app: './src/index.html'
				}
			}
		}
	};
});