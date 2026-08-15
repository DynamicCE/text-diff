import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/text-diff/',
  test: {
    globals: false,
    include: ['src/**/*.test.ts'],
  },
});
