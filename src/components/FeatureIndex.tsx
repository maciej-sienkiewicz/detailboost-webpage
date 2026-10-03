import { motion } from 'motion/react';
import type { Scene } from './ScenePlayer';

export type IndexItem = {
    text: string;
    /** Indeks nagrania w SCENES. */
    scene: number;
};

export type ItemState = 'idle' | 'scene' | 'current';

/**
 * Spis funkcji przy oknie, jak spis treści: pogrupowany według nagrań, w kolejności,
 * w jakiej lecą. Każda pozycja to krok nagrania - kliknięcie przewija okno do niego,
 * a krok, który właśnie leci, jest biały ze złotą kreską od strony okna. Pozycje
 * nagrania, które gra, są jaśniejsze o stopień, reszta przygaszona.
 *
 * Porządek zamiast plakatu: obrócone, ściśnięte wersaliki wyglądały jak reklama
 * sieciówki. Tu krój jest ten sam co w pasku i przyciskach, a ruch to tylko
 * jedno ciche wejście i przesuwająca się kreska.
 *
 *  - `side="l" | "r"` - kolumna przy oknie (od 1280 px): pozycje jedna pod drugą,
 *    wyrównane do okna, kreska po stronie okna;
 *  - `side="flow"` - pod oknem (telefon, tablet): pozycje w wierszach, kreska pod
 *    bieżącą.
 */
export function FeatureIndex({
    scenes,
    groups,
    items,
    states,
    onPick,
    side,
    className = '',
}: {
    scenes: readonly Scene[];
    /** Indeksy nagrań, które pokazuje ta kolumna. */
    groups: readonly number[];
    items: readonly IndexItem[];
    states: readonly ItemState[];
    onPick: (index: number) => void;
    side: 'l' | 'r' | 'flow';
    className?: string;
}) {
    const flow = side === 'flow';
    const right = side === 'l';
    let order = 0;

    return (
        <nav
            aria-label="Funkcje na nagraniach"
            className={`font-ui ${flow ? 'grid gap-x-10 gap-y-7 sm:grid-cols-2' : 'flex flex-col gap-8'} ${className}`}
        >
            {groups.map((g) => {
                const scene = scenes[g];
                if (!scene) return null;
                const live = states.some((s, i) => s !== 'idle' && items[i]?.scene === g);
                return (
                    <section key={scene.id} aria-label={scene.title} className={right ? 'text-right' : ''}>
                        <motion.h3
                            initial={{ opacity: 0, y: 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.6, delay: order++ * 0.03, ease: [0.16, 1, 0.3, 1] }}
                            className={`font-mono text-[0.625rem] tracking-[0.14em] uppercase transition-colors duration-500 ${
                                live ? 'text-gold-200/90' : 'text-dim'
                            } ${flow ? '' : right ? 'pr-6' : 'pl-6'}`}
                        >
                            {String(g + 1).padStart(2, '0')}
                            <span className="ml-2">{scene.title}</span>
                        </motion.h3>
                        <ul className={flow ? 'mt-2 flex flex-wrap gap-x-5 gap-y-1' : 'mt-2.5 flex flex-col'}>
                            {items.map((item, i) => {
                                if (item.scene !== g) return null;
                                const state = states[i] ?? 'idle';
                                return (
                                    <motion.li
                                        key={item.text}
                                        initial={{ opacity: 0, y: 8 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: '-40px' }}
                                        transition={{ duration: 0.6, delay: order++ * 0.03, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <Entry text={item.text} state={state} side={side} onClick={() => onPick(i)} />
                                    </motion.li>
                                );
                            })}
                        </ul>
                    </section>
                );
            })}
        </nav>
    );
}

function Entry({
    text,
    state,
    side,
    onClick,
}: {
    text: string;
    state: ItemState;
    side: 'l' | 'r' | 'flow';
    onClick: () => void;
}) {
    const current = state === 'current';
    const tone = current ? 'text-white' : state === 'scene' ? 'text-white/70 hover:text-white' : 'text-white/40 hover:text-white/80';

    if (side === 'flow') {
        return (
            <button
                type="button"
                aria-current={current ? 'step' : undefined}
                onClick={onClick}
                className={`relative py-1.5 text-[0.9375rem] font-medium tracking-[-0.01em] transition-colors duration-300 ${tone}`}
            >
                {text}
                <span
                    aria-hidden
                    className={`absolute inset-x-0 bottom-0.5 h-px origin-left bg-gold-400 transition-transform duration-500 ease-out-expo ${
                        current ? 'scale-x-100' : 'scale-x-0'
                    }`}
                />
            </button>
        );
    }

    // Kreska stoi po stronie okna: w lewej kolumnie po prawej, w prawej po lewej.
    const towardWindow = side === 'l' ? 'right-0 origin-right' : 'left-0 origin-left';
    return (
        <button
            type="button"
            aria-current={current ? 'step' : undefined}
            onClick={onClick}
            className={`relative block w-full py-[0.3125rem] text-[0.9375rem] leading-snug font-medium tracking-[-0.01em] transition-colors duration-300 ${
                side === 'l' ? 'pr-6 text-right' : 'pl-6 text-left'
            } ${tone}`}
        >
            {text}
            <span
                aria-hidden
                className={`absolute top-1/2 h-px w-3.5 bg-gold-400 transition-transform duration-500 ease-out-expo ${towardWindow} ${
                    current ? 'scale-x-100' : 'scale-x-0'
                }`}
            />
        </button>
    );
}
