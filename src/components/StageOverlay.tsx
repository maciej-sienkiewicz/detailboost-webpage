import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Narrator, cueFor, cuesOf } from '../audio/narration';
import { Soundtrack } from '../audio/soundtrack';
import type { Player } from './ScenePlayer';

/**
 * Warstwa nad nagraniem: kliknięcie w okno zatrzymuje i wznawia, a w rogu stoi
 * przełącznik dźwięku. Bez paska sterowania pod oknem - okno samo jest przyciskiem.
 *
 * Dźwięk to lektor i muzyka pod nim. Startuje wyciszony (przeglądarki i tak nie
 * wpuszczają dźwięku bez gestu, a strona, która nagle gra, to strona, którą się
 * zamyka). Gra tylko wtedy, gdy nagranie leci: pauza, okno poza ekranem albo karta
 * w tle zatrzymują lektora w pół zdania i wyciszają muzykę; wznowienie dokańcza zdanie.
 */
export function StageOverlay({ player }: { player: Player }) {
    const sound = useRef<Soundtrack | null>(null);
    const voice = useRef<Narrator | null>(null);
    const last = useRef({ scene: -1, beat: -1 });
    const root = useRef<HTMLDivElement>(null);
    const [on, setOn] = useState(false);
    const [visible, setVisible] = useState(true);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        const el = root.current;
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => setVisible((entry?.intersectionRatio ?? 0) > 0.2), {
            threshold: [0, 0.2, 0.5],
        });
        io.observe(el);
        const onVisibility = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            io.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
            sound.current?.dispose();
            sound.current = null;
            voice.current?.stop();
            voice.current = null;
        };
    }, []);

    const playing = !player.paused && visible && !hidden;

    useEffect(() => {
        sound.current?.setActive(playing);
        if (playing) voice.current?.resume();
        else voice.current?.hold();
    }, [playing]);

    // Nowy krok: zdanie lektora, jeśli jest do niego przypięte, a jeśli nie - cichy
    // dzwonek. Przeskok (inne nagranie, krok wstecz albo o więcej niż jeden naprzód,
    // czyli kliknięcie w spis) ucina bieżące zdanie - mówiłoby o czymś, czego już nie widać.
    useEffect(() => {
        const prev = last.current;
        last.current = { scene: player.active, beat: player.beat };
        const narrator = voice.current;
        if (!narrator || !on) return;
        if (player.active !== prev.scene) narrator.prefetch(cuesOf(player.active));
        const jumped = player.active !== prev.scene || player.beat < prev.beat || player.beat > prev.beat + 1;
        if (jumped) narrator.stop();
        if (player.phase !== 'video' || player.beat < 0) return;
        const cue = cueFor(player.active, player.beat);
        if (cue) narrator.say(cue);
        else sound.current?.chime();
    }, [player.active, player.beat, player.phase, on]);

    const toggleSound = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!sound.current) sound.current = new Soundtrack();
        if (!voice.current) {
            const narrator = new Narrator();
            narrator.onSpeaking = (speaking) => sound.current?.duck(speaking);
            voice.current = narrator;
        }
        if (sound.current.enabled) {
            sound.current.disable();
            voice.current.stop();
            setOn(false);
        } else {
            voice.current.unlock();
            voice.current.prefetch(cuesOf(player.active));
            sound.current.setActive(playing);
            sound.current.enable();
            setOn(true);
        }
    };

    return (
        <div ref={root} className="absolute inset-0 z-10">
            <button
                type="button"
                onClick={player.togglePause}
                aria-pressed={player.paused}
                aria-label={player.paused ? 'Wznów nagranie' : 'Zatrzymaj nagranie'}
                className="absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-offset-[-4px]"
            />

            <AnimatePresence>
                {player.paused && (
                    <motion.div
                        key="paused"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25"
                    >
                        <div className="rounded-xl border border-white/[0.12] bg-[#0d0d10]/80 px-5 py-3 text-center font-ui shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)] backdrop-blur-md">
                            <p className="text-[0.9375rem] font-semibold text-white">Pauza</p>
                            <p className="mt-0.5 text-[0.75rem] text-white/60">Kliknij nagranie, aby wznowić</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={toggleSound}
                aria-pressed={on}
                className={`absolute top-2.5 right-2.5 rounded-lg border px-2.5 py-1 font-ui text-[0.6875rem] font-medium backdrop-blur-md transition-colors duration-200 sm:top-3.5 sm:right-3.5 sm:px-3 sm:py-1.5 sm:text-[0.75rem] ${
                    on
                        ? 'border-gold-400/50 bg-[#0d0d10]/75 text-gold-50 hover:bg-[#0d0d10]/90'
                        : 'border-white/[0.14] bg-[#0d0d10]/60 text-white/80 hover:bg-[#0d0d10]/85 hover:text-white'
                }`}
            >
                {on ? 'Wycisz' : 'Włącz dźwięk'}
            </button>
        </div>
    );
}
