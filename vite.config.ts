import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        // Dwie wersje strony głównej: ciemna z nagraniami (index.html) i jasna
        // w układzie szablonu GeneratePress (v2.html). Wspólne treści: src/content.ts.
        // Podstrona /poznaj-program/ z animacjami-instrukcjami (ścieżki od katalogu projektu).
        rollupOptions: {
            input: {
                main: 'index.html',
                v2: 'v2.html',
                poznaj: 'poznaj-program/index.html',
            },
        },
    },
});
