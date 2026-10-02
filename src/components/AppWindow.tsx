type Shot = {
    srcSet: string;
    caption: string;
};

type AppWindowProps = {
    address: string;
    /** `<source>` nie zmienia `alt`, więc jeden opis musi pasować do obu kadrów. */
    alt: string;
    desktop: Shot & { src: string };
    /** Zrzut z układu mobilnego CRM - poniżej 640 px zastępuje zrzut z komputera. */
    mobile: Shot;
};

/**
 * Okno aplikacji bez „świateł" systemu i bez ikon przeglądarki: pasek niesie tylko
 * adres, złożony tym samym krojem co reszta strony. Kadr to prawdziwy zrzut z CRM,
 * więc obramowanie ma 1 px i nic nie odwraca od niego uwagi.
 *
 * Na telefonie pokazujemy zrzut z TELEFONU, a nie pomniejszony ekran komputera
 * (na 350 px jego litery miały ok. 3 px). Kadr mobilny ma inną proporcję, więc
 * proporcję i podpis przełącza ten sam próg co `<source media>` - inaczej obraz
 * i ramka rozjechałyby się na jednym z ekranów.
 *
 * Tło #F1F2F4 zostaje widoczne, dopóki obraz się nie wczyta (i zastępuje go, gdy
 * pliku brak) - proporcja jest zaszyta w kontenerze, więc układ nie skacze.
 */
export function AppWindow({ address, alt, desktop, mobile }: AppWindowProps) {
    return (
        <figure>
            <div className="mx-auto max-w-[24rem] overflow-hidden rounded-[3px] border border-ink/12 bg-white shadow-[0_1px_0_rgba(10,10,10,0.04),0_24px_48px_-24px_rgba(10,10,10,0.22),0_64px_96px_-48px_rgba(10,10,10,0.16)] sm:max-w-none">
                <div className="flex h-8 items-center justify-center border-b border-rule bg-paper px-3">
                    <span className="truncate text-[0.6875rem] font-medium tracking-[0.01em] text-mute">
                        {address}
                    </span>
                </div>
                <div className="aspect-[390/640] bg-[#F1F2F4] sm:aspect-[16/10]">
                    <picture>
                        <source media="(max-width: 639px)" srcSet={mobile.srcSet} sizes="24rem" />
                        <img
                            src={desktop.src}
                            srcSet={desktop.srcSet}
                            sizes="(min-width: 1600px) 900px, (min-width: 1280px) 60vw, 100vw"
                            alt={alt}
                            width={2880}
                            height={1800}
                            fetchPriority="high"
                            decoding="async"
                            className="block h-full w-full object-cover object-top-left"
                        />
                    </picture>
                </div>
            </div>
            <figcaption className="mt-4 text-center text-[0.75rem] tracking-[-0.003em] text-mute">
                <span className="sm:hidden">{mobile.caption}</span>
                <span className="hidden sm:inline">{desktop.caption}</span>
            </figcaption>
        </figure>
    );
}
