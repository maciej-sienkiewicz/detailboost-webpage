import { BENEFITS } from '../content';
import { container, sectionKicker, sectionTitle } from './ui';

const label = 'font-mono text-[0.625rem] tracking-[0.16em] uppercase';

export function Benefits({ onShow }: { onShow: (scene: string, beat?: string) => void }) {
    return (
        <section id="funkcje" aria-labelledby="funkcje-title" className="scroll-mt-24">
            <div className={container}>
                <p className={sectionKicker}>Funkcje</p>
                <h2 id="funkcje-title" className={`mt-4 max-w-[48rem] ${sectionTitle}`}>
                    Co zmienia się w studiu<span className="text-gold-400">.</span>
                </h2>

                <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] sm:mt-16 md:grid-cols-2 xl:grid-cols-3">
                    {BENEFITS.map((b) => (
                        <li key={b.change} className="flex flex-col bg-void p-6 sm:p-8">
                            <p className={`${label} text-dim`}>Dziś</p>
                            <p className="mt-2.5 text-[0.9375rem] leading-[1.55] text-pretty text-white/45 md:min-h-[3.1em]">{b.today}</p>

                            {/* Przejście „dziś → z DetailBoost": linia z krótkim złotym odcinkiem
                                na początku, jak wskaźnik bieżącego kroku przy oknie. */}
                            <div aria-hidden className="relative my-6 h-px bg-white/[0.08]">
                                <span className="absolute inset-y-0 left-0 w-8 bg-gold-400" />
                            </div>

                            <p className={`${label} text-gold-200/90`}>Z DetailBoost</p>
                            <h3 className="mt-2.5 font-ui text-[1.1875rem] leading-snug font-semibold tracking-[-0.02em] text-balance text-paper">
                                {b.change}
                            </h3>
                            <p className="mt-2.5 text-[0.9375rem] leading-[1.6] text-pretty text-mute">{b.how}</p>

                            <button
                                type="button"
                                onClick={() => onShow(b.scene, b.beat)}
                                className="group mt-auto inline-flex w-fit pt-7 font-ui text-[0.875rem] font-medium text-white/80 transition-colors duration-200 hover:text-white"
                            >
                                <span className="border-b border-white/20 pb-0.5 transition-colors duration-200 group-hover:border-gold-400">
                                    Zobacz na nagraniu
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
