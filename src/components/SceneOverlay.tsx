import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

/** Obszar kadru w procentach szerokości/wysokości nagrania (1440 × 900). */
export type Focus = { x: number; y: number; w: number; h: number };

export type Beat = {
    /** Sekunda nagrania, od której beat obowiązuje (z capture/*.timing.json). */
    at: number;
    /** Krótka etykieta kroku, wersalikami w Geist Mono. */
    step: string;
    /** Jedno zdanie: co się właśnie dzieje na ekranie. */
    text: string;
    /** Na czym ma spocząć wzrok; bez - kamera wraca do całego kadru. */
    focus?: Focus;
    /** Przybliżenie kamery na `focus`; 1 = bez przybliżenia. */
    zoom?: number;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Warstwa „motion" nad nagraniem: kamera, podświetlenie i podpis kroku.
 *
 * Kamera przybliża kadr na obszar, o którym jest podpis, bo nagranie interfejsu
 * pomniejszone do okna na stronie ma drobny tekst - bez tego widz widzi, że coś się
 * dzieje, ale nie widzi co. Przybliżenie jest umiarkowane (do ok. 1,5×): nagranie ma
 * 1920 px szerokości, a okno na ekranie Retina ok. 1700 px, więc większe przybliżenie
 * zaczęłoby rozmywać tekst.
 *
 * Złota ramka i podpis mówią to samo co kamera, innym kanałem: ramka GDZIE, podpis CO.
 */
export function SceneCamera({ focus, zoom = 1, children }: { focus?: Focus; zoom?: number; children: ReactNode }) {
    const z = focus ? zoom : 1;
    // Transformacja `translate() scale()` z osią w środku przenosi punkt odległy o d od
    // środka w z·d + x. Środek obszaru staje na środku okna przy x = z·(50 − cx)%,
    // a żeby krawędź nagrania nie odsłoniła tła, |x| ≤ (z − 1)·50%.
    const cx = focus ? focus.x + focus.w / 2 : 50;
    const cy = focus ? focus.y + focus.h / 2 : 50;
    const max = (z - 1) * 50;
    const tx = clamp(z * (50 - cx), -max, max);
    const ty = clamp(z * (50 - cy), -max, max);
    return (
        <motion.div
            className="absolute inset-0 origin-center will-change-transform"
            animate={{ scale: z, x: `${tx}%`, y: `${ty}%` }}
            transition={{ duration: 1.1, ease: EASE }}
        >
            {children}
        </motion.div>
    );
}

export function FocusRing({ focus, beatKey }: { focus?: Focus; beatKey: string }) {
    return (
        <AnimatePresence>
            {focus && (
                <motion.div
                    key={beatKey}
                    aria-hidden
                    className="pointer-events-none absolute rounded-[10px] border border-gold-200/90 shadow-[0_0_0_1px_rgb(8_8_10/0.35),0_0_40px_-4px_rgb(220_174_92/0.55)]"
                    style={{ left: `${focus.x}%`, top: `${focus.y}%`, width: `${focus.w}%`, height: `${focus.h}%` }}
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
                />
            )}
        </AnimatePresence>
    );
}

export function BeatCaption({ beat, index, total }: { beat?: Beat; index: number; total: number }) {
    return (
        <div aria-live="polite" className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-start sm:inset-x-5 sm:bottom-5">
            <AnimatePresence mode="wait">
                {beat && (
                    <motion.div
                        key={`${index}-${beat.step}`}
                        className="max-w-[min(30rem,88%)] rounded-[6px] border border-white/10 bg-[rgb(10_10_12/0.82)] px-2.5 py-1.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] backdrop-blur-md sm:px-4 sm:py-3"
                        initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                        transition={{ duration: 0.45, ease: EASE }}
                    >
                        <div className="flex items-center gap-2 font-mono text-[0.5625rem] tracking-[0.14em] text-gold-200 uppercase sm:gap-2.5 sm:text-[0.6875rem] sm:tracking-[0.16em]">
                            <span className="tabular-nums">
                                {String(index + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
                            </span>
                            <span aria-hidden className="h-px w-4 bg-gold-400/60" />
                            <span>{beat.step}</span>
                        </div>
                        <motion.p
                            className="mt-0.5 text-[0.6875rem] leading-snug tracking-[-0.01em] text-pretty text-paper sm:mt-1 sm:text-[0.9375rem]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.12 }}
                        >
                            {beat.text}
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function clamp(v: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, v));
}
