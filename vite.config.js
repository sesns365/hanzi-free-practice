import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base 用相對路徑，放在 GitHub Pages 的任何儲存庫名稱底下都能正常運作。
export default defineConfig({base: './', plugins: [react(), tailwindcss()]});
