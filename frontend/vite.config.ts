import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind to all interfaces so a browser outside the VM can load the app
    // at http://<vm-ip>:5173 (default is localhost-only).
    host: true,
    // Vite 6+ blocks requests with unrecognized Host headers (DNS-rebinding
    // protection); allow the VM's LAN IP. Dev-only — don't expose this on an
    // untrusted network.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
