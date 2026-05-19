import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  /** Escuchar en todas las interfaces: probá desde el celular con http://IP-DE-TU-PC:5174 */
  server: { port: 5174, host: true, strictPort: true },
  preview: { port: 4173, host: true, strictPort: true },
});
