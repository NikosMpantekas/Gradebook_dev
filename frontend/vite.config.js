import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import fs from 'fs';

// Versioning plugin to generate version.json at build time
const versionPlugin = () => {
  const buildId = process.env.VITE_BUILD_ID || new Date().getTime().toString();
  return {
    name: 'version-plugin',
    config: () => ({
      define: {
        __BUILD_ID__: JSON.stringify(buildId),
      }
    }),
    closeBundle: () => {
      const outDir = path.resolve(__dirname, 'build');
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify({ build_id: buildId }, null, 2)
      );
      console.log(`[Version Plugin] Wrote build_id ${buildId} to version.json`);
    }
  };
};

export default defineConfig({
  plugins: [
    versionPlugin(),
    react(),
    svgr(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: false, // Use existing manifest.json in public/
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'src': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
         target: 'http://localhost:5000',
         changeOrigin: true,
      }
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});
