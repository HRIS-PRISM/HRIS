import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    host: true,
    port: 5137,
  },
  // `npm run preview` uses a separate port (Vite default 4173) — pin it to 5137
  // so every way of running the frontend serves on http://localhost:5137.
  preview: {
    host: true,
    port: 5137,
  },
  ssr: {
    optimizeDeps: {
      include: ['dayjs'],
    },
  },
  build: {
    commonjsOptions: {
      esmExternals: true,
    },
  },
});