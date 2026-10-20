import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        // Druga strona: /poznaj-program/ z animacjami-instrukcjami (ścieżki od katalogu projektu).
        rollupOptions: {
            input: {
                main: 'index.html',
                poznaj: 'poznaj-program/index.html',
            },
        },
    },
});
