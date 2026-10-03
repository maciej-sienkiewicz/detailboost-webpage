import script from '../scenes/narration.json';
import { SCENES, findStep } from '../scenes';

/**
 * Lektor: zdania ze src/scenes/narration.json, wygenerowane przez capture/narration.py
 * do public/narration/<scena>-<n>.mp3. Zdanie startuje, gdy nagranie dojdzie do kroku,
 * do którego jest przypięte; generator pilnuje, żeby skończyło się przed następnym.
 */
const DIR = `${import.meta.env.BASE_URL}narration/`;

/** Nagranie (indeks w SCENES) → krok (indeks beatu) → plik zdania. */
const CUES: ReadonlyMap<number, ReadonlyMap<number, string>> = new Map(
    Object.entries(script as Record<string, { beat: string; text: string }[]>).map(([sceneId, cues]) => {
        const scene = SCENES.findIndex((s) => s.id === sceneId);
        return [scene, new Map(cues.map((cue, i) => [findStep(sceneId, cue.beat).beat, `${DIR}${sceneId}-${i}.mp3`]))];
    }),
);

export function cueFor(scene: number, beat: number) {
    return CUES.get(scene)?.get(beat);
}

/** Pliki zdań nagrania - do wcześniejszego pobrania, zanim lektor ich użyje. */
export function cuesOf(scene: number) {
    return [...(CUES.get(scene)?.values() ?? [])];
}

// Najkrótszy poprawny WAV (cisza) - do odblokowania odtwarzacza w geście kliknięcia (iOS).
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

/**
 * Jeden element <audio> na całego lektora: Safari na iOS wpuszcza dźwięk tylko do
 * elementu, który raz zagrał w geście użytkownika - dlatego `unlock()` w kliknięciu
 * „Włącz dźwięk", a potem ten sam element dostaje kolejne zdania.
 */
export class Narrator {
    private audio = new Audio();
    private cached = new Set<string>();
    onSpeaking: (speaking: boolean) => void = () => {};

    constructor() {
        this.audio.preload = 'auto';
        this.audio.addEventListener('playing', () => this.onSpeaking(true));
        this.audio.addEventListener('pause', () => this.onSpeaking(false));
        this.audio.addEventListener('ended', () => this.onSpeaking(false));
    }

    unlock() {
        this.audio.src = SILENCE;
        void this.audio.play().catch(() => {});
    }

    say(src: string) {
        this.audio.pause();
        this.audio.src = src;
        void this.audio.play().catch(() => {});
    }

    /** Zatrzymanie z zachowaniem miejsca - `resume()` dokończy zdanie. */
    hold() {
        if (!this.audio.paused) this.audio.pause();
    }

    resume() {
        if (this.audio.src && this.audio.src !== SILENCE && this.audio.paused && !this.audio.ended && this.audio.currentTime > 0) {
            void this.audio.play().catch(() => {});
        }
    }

    stop() {
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();
    }

    prefetch(srcs: readonly string[]) {
        for (const src of srcs) {
            if (this.cached.has(src)) continue;
            this.cached.add(src);
            const a = new Audio();
            a.preload = 'auto';
            a.src = src;
        }
    }
}
