import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig((configEnv) => {
	const isDevelopment = configEnv.mode === "development";

	return {
		plugins: [react()],
		css: {
			modules: {
				generateScopedName: isDevelopment ? "[name]__[local]__[hash:base64:5]" : "[hash:base64:5]",
			},
		},
		build: {
			rollupOptions: {
				output: {
					entryFileNames: `assets/[name].js`,
					chunkFileNames: `assets/[name].js`,
					assetFileNames: `assets/[name].[ext]`,
				}
			}
		}
	};
});