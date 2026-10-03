import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Soundtrack } from '../audio/soundtrack';
import type { Player } from './ScenePlayer';

/**
 * Warstwa nad nagraniem: kliknięcie w okno zatrzymuje i wznawia, a w rogu stoi
 * przełącznik dźwięku. Bez paska sterowania pod oknem - okno samo jest przyciskiem.
 *
 * Dźwięk startuje wyciszony (przeglądarki i tak nie wpuszczają dźwięku bez gestu,
 * a strona, która nagle gra, to strona, którą się zamyka). Gra tylko wtedy, gdy
 * nagranie leci: pauza, okno poza ekranem albo karta w tle wyciszają go łagodnie.
 */
export function StageOverlay({ player }: { player: Player }) {
    const sound = useRef<Soundtrack | null>(null);
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
        };
    }, []);

    const playing = !player.paused && visible && !hidden;

    useEffect(() => {
        sound.current?.setActive(playing);
    }, [playing]);

    // Każdy nowy krok nagrania dostaje cichy dzwonek (gdy dźwięk jest włączony).
    useEffect(() => {
        if (player.phase === 'video' && player.beat >= 0) sound.current?.chime();
    }, [player.active, player.beat, player.phase]);

    const toggleSound = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!sound.current) sound.current = new Soundtrack();
        if (sound.current.enabled) {
            sound.current.disable();
            setOn(false);
        } else {
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
