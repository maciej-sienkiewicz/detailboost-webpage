/**
 * Przyciski strony w stylu paska nawigacji (fotohub.app): biały główny z jasną
 * krawędzią u góry i złotą poświatą, drugi jako przygaszona szyba. Klasy, nie
 * komponent - te same style idą na <a> do aplikacji i na <button> w stronie.
 */
export const btnPrimary =
    'inline-flex h-12 items-center justify-center rounded-lg bg-white px-6 font-ui text-[0.9375rem] font-semibold whitespace-nowrap text-[#0a0709] shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_14px_34px_-12px_rgb(220_174_92/0.8)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-gold-50 hover:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),0_16px_40px_-10px_rgb(220_174_92/0.95)] active:translate-y-px';

export const btnSecondary =
    'inline-flex h-12 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03] px-6 font-ui text-[0.9375rem] font-medium whitespace-nowrap text-white/80 transition-colors duration-200 hover:bg-white/[0.07] hover:text-white';

/** Nagłówek sekcji: ten sam Archivo co hero, ale o połowę mniejszy - krój ma akcentować, nie krzyczeć. */
export const sectionTitle =
    'font-display text-[clamp(2rem,8vw,2.75rem)] leading-[0.92] font-[800] tracking-[-0.03em] text-paper uppercase [font-stretch:80%] text-balance sm:text-[clamp(2.5rem,4.6vw,4rem)] sm:[font-stretch:100%]';

/** Mały nadpis sekcji: numer i nazwa w Geist Mono, jak licznik nagrań pod oknem. */
export const sectionKicker = 'font-mono text-[0.6875rem] tracking-[0.16em] text-dim uppercase';

/**
 * Szerokość treści sekcji: te same marginesy co hero i pasek (px-5 / px-8 / px-12),
 * kolumna najwyżej 80rem - lewa krawędź każdej sekcji stoi w pionie z logo.
 */
export const container = 'mx-auto max-w-[calc(80rem+6rem)] px-5 py-24 sm:px-8 sm:py-32 lg:px-12';
