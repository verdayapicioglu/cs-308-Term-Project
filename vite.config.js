// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // "describe", "test", "expect" gibi fonksiyonları import etmeden kullanmanı sağlar
    environment: 'jsdom', // React için tarayıcı ortamı
    setupFiles: './src/setupTests.js', // Her testten önce çalışacak ayar dosyası
    css: true, // CSS dosyalarını işlemesi için
  },
});