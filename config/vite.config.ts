import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Centralised Vite configuration shared by all npm scripts.
export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/exo-ui/",
  plugins: [react()],
}));
