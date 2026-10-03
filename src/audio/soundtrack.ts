/**
 * Ścieżka dźwiękowa do nagrań, grana na żywo w Web Audio - bez pliku, bez licencji.
 *
 * Spokojny ambient: cztery akordy (Fmaj9, Am9, Dm9, Cmaj7) po 8 s, każdy głos to
 * para lekko rozstrojonych oscylatorów z długim narastaniem i wybrzmieniem, przez
 * filtr dolnoprzepustowy z wolnym LFO i pogłos z wygenerowanej odpowiedzi
 * impulsowej. Pod spodem cichy bas, nad nim kilka rzadkich dźwięków z akordu
 * w wyższej oktawie, żeby tło nie stało w miejscu. Zmiana kroku na nagraniu
 * dostaje cichy dzwonek w tonacji bieżącego akordu.
 *
 * Dźwięk gra tylko, gdy użytkownik go włączył I nagranie leci (nie pauza, okno na
 * ekranie, karta na wierzchu). Wyłączenie to wyciszenie z łagodnym wygaszeniem,
 * a planowanie kolejnych akordów staje - nic nie liczy się w tle.
 */

const CHORDS: readonly (readonly number[])[] = [
    [53, 57, 60, 64, 67], // Fmaj9
    [57, 60, 64, 67, 71], // Am9
    [50, 57, 60, 64, 65], // Dm9
    [48, 55, 59, 64, 67], // Cmaj7
];
const BASS = [41, 45, 38, 36] as const;
const BAR = 8;
const VOLUME = 0.55;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export class Soundtrack {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private pad: BiquadFilterNode | null = null;
    private wet: ConvolverNode | null = null;
    private timer = 0;
    private bar = 0;
    private wanted = false;
    private active = false;
    private scheduled = false;

    get enabled() {
        return this.wanted;
    }

    /** Musi zostać wywołane w obsłudze kliknięcia - przeglądarka wpuszcza dźwięk tylko po geście. */
    enable() {
        this.wanted = true;
        this.ensureGraph();
        void this.ctx?.resume();
        this.update();
    }

    disable() {
        this.wanted = false;
        this.update();
    }

    /** Czy nagranie właśnie leci (nie pauza, na ekranie). */
    setActive(active: boolean) {
        this.active = active;
        this.update();
    }

    /** Cichy dzwonek na zmianę kroku, w tonacji bieżącego akordu. */
    chime() {
        const ctx = this.ctx;
        if (!ctx || !this.wet || !this.master || !this.audible) return;
        const chord = CHORDS[(this.bar + CHORDS.length - 1) % CHORDS.length]!;
        const note = chord[Math.floor(Math.random() * chord.length)]! + 24;
        const t = ctx.currentTime + 0.02;
        this.bell(hz(note), t, 0.05, 2.2);
    }

    dispose() {
        window.clearTimeout(this.timer);
        void this.ctx?.close();
        this.ctx = null;
    }

    private get audible() {
        return this.wanted && this.active;
    }

    private ensureGraph() {
        if (this.ctx) return;
        const ctx = new AudioContext();
        const master = ctx.createGain();
        master.gain.value = 0;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -14;
        limiter.ratio.value = 6;
        master.connect(limiter).connect(ctx.destination);

        const wet = ctx.createConvolver();
        wet.buffer = impulse(ctx, 4.2);
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.55;
        wet.connect(wetGain).connect(master);

        // Filtr „oddycha": odcięcie pływa wolno między ok. 900 a 1700 Hz.
        const pad = ctx.createBiquadFilter();
        pad.type = 'lowpass';
        pad.frequency.value = 1300;
        pad.Q.value = 0.4;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.045;
        const depth = ctx.createGain();
        depth.gain.value = 400;
        lfo.connect(depth).connect(pad.frequency);
        lfo.start();
        pad.connect(master);
        pad.connect(wet);

        this.ctx = ctx;
        this.master = master;
        this.pad = pad;
        this.wet = wet;
    }

    private update() {
        const ctx = this.ctx;
        const master = this.master;
        if (!ctx || !master) return;
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        if (this.audible) {
            master.gain.linearRampToValueAtTime(VOLUME, now + 1.5);
            if (!this.scheduled) {
                this.scheduled = true;
                this.playBar(now + 0.05);
            }
        } else {
            master.gain.linearRampToValueAtTime(0, now + 0.8);
            window.clearTimeout(this.timer);
            this.scheduled = false;
        }
    }

    private playBar(start: number) {
        const ctx = this.ctx;
        const pad = this.pad;
        if (!ctx || !pad) return;
        const i = this.bar % CHORDS.length;
        const chord = CHORDS[i]!;
        this.bar += 1;

        for (const note of chord) this.voice(hz(note), start, BAR, 0.03);
        this.voice(hz(BASS[i]!), start, BAR, 0.05, 'sine');

        // Kilka rzadkich dźwięków z akordu oktawę wyżej, w losowych miejscach taktu.
        const count = 2 + Math.floor(Math.random() * 3);
        for (let k = 0; k < count; k++) {
            const note = chord[Math.floor(Math.random() * chord.length)]! + 12;
            this.bell(hz(note), start + 0.8 + Math.random() * (BAR - 1.6), 0.022, 3);
        }

        const next = start + BAR;
        this.timer = window.setTimeout(() => {
            if (this.audible) this.playBar(next);
            else this.scheduled = false;
        }, Math.max(0, (next - ctx.currentTime - 0.25) * 1000));
    }

    /** Głos podkładu: dwa rozstrojone oscylatory, wolne wejście, długie wybrzmienie. */
    private voice(freq: number, start: number, length: number, level: number, type: OscillatorType = 'triangle') {
        const ctx = this.ctx!;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(level, start + 2.4);
        env.gain.setValueAtTime(level, start + length - 0.5);
        env.gain.exponentialRampToValueAtTime(0.0001, start + length + 3);
        env.connect(this.pad!);
        for (const cents of [-5, 5]) {
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.value = freq;
            osc.detune.value = cents;
            osc.connect(env);
            osc.start(start);
            osc.stop(start + length + 3.1);
        }
    }

    /** Krótki dźwięk jak szklany dzwonek: sinus z alikwotem, szybki atak, długie wybrzmienie w pogłosie. */
    private bell(freq: number, start: number, level: number, decay: number) {
        const ctx = this.ctx!;
        const env = ctx.createGain();
        env.gain.setValueAtTime(0, start);
        env.gain.linearRampToValueAtTime(level, start + 0.012);
        env.gain.exponentialRampToValueAtTime(0.0001, start + decay);
        env.connect(this.wet!);
        env.connect(this.master!);
        for (const [ratio, gain] of [[1, 1], [2.01, 0.25]] as const) {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq * ratio;
            const g = ctx.createGain();
            g.gain.value = gain;
            osc.connect(g).connect(env);
            osc.start(start);
            osc.stop(start + decay + 0.1);
        }
    }
}

/** Odpowiedź impulsowa pogłosu: stereofoniczny szum gasnący wykładniczo. */
function impulse(ctx: AudioContext, seconds: number) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
    }
    return buffer;
}
