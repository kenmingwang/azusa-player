import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig(({ mode }) => {
  const isExtensionBuild = mode === 'extension';

  return {
    plugins: [
      react(),
      ...(isExtensionBuild ? [crx({ manifest })] : []),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        port: 5173,
      },
    },
  };
});
