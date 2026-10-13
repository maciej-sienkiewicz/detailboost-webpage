/**
 * Makiety urządzeń z prawdziwymi ekranami DetailBoost (zrzuty z konta demo w public/v2):
 * tablet w poziomie i telefon. Obudowy rysowane w CSS - grafitowa rama z jaśniejszą
 * krawędzią, kamera, przyciski boczne i delikatny odblask szkła - więc ostre na każdym
 * ekranie i bez ciężkich plików PNG z ramkami.
 *
 * Wymiary w em: jeden font-size na korzeniu skaluje całą kompozycję.
 */

/** Odblask szkła: ukośne, ledwie widoczne światło nad ekranem. */
const glass =
    'pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/0.14)_0%,rgb(255_255_255/0)_38%)]';

/** Obudowa bez `position` - telefon w kompozycji jest `absolute`, a dwie klasy pozycji się wykluczają. */
const body =
    'bg-[linear-gradient(145deg,#3a3d43_0%,#1c1e22_40%,#111215_100%)] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14),inset_0_1px_0_rgb(255_255_255/0.22)]';

export function TabletFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
    return (
        <div className={`${body} relative rounded-[1.9em] p-[0.95em] ${className}`}>
            {/* kamera na dłuższej krawędzi */}
            <span aria-hidden className="absolute top-[0.36em] left-1/2 size-[0.32em] -translate-x-1/2 rounded-full bg-[#0b0c0e] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" />
            {/* przyciski głośności i blokady na górnej krawędzi */}
            <span aria-hidden className="absolute -top-[0.16em] right-[5em] h-[0.18em] w-[2.4em] rounded-t-full bg-[#2a2c31]" />
            <span aria-hidden className="absolute -top-[0.16em] right-[8.2em] h-[0.18em] w-[2.4em] rounded-t-full bg-[#2a2c31]" />
            <div className="relative overflow-hidden rounded-[1em] bg-white">
                <img src={src} alt={alt} width={1366} height={1024} className="block aspect-[1366/1024] w-full" loading="eager" decoding="async" />
                <span aria-hidden className={glass} />
            </div>
        </div>
    );
}

export function PhoneFrame({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
    return (
        <div className={`${body} ${className.includes('absolute') ? '' : 'relative'} rounded-[2.2em] p-[0.5em] ${className}`}>
            {/* przyciski boczne */}
            <span aria-hidden className="absolute top-[5.5em] -left-[0.14em] h-[1.4em] w-[0.16em] rounded-l-full bg-[#2a2c31]" />
            <span aria-hidden className="absolute top-[7.6em] -left-[0.14em] h-[2.4em] w-[0.16em] rounded-l-full bg-[#2a2c31]" />
            <span aria-hidden className="absolute top-[10.4em] -left-[0.14em] h-[2.4em] w-[0.16em] rounded-l-full bg-[#2a2c31]" />
            <span aria-hidden className="absolute top-[8em] -right-[0.14em] h-[3.4em] w-[0.16em] rounded-r-full bg-[#2a2c31]" />
            <div className="relative overflow-hidden rounded-[1.75em] bg-white">
                <img src={src} alt={alt} width={390} height={844} className="block aspect-[390/844] w-full" loading="eager" decoding="async" />
                {/* wyspa z kamerą */}
                <span aria-hidden className="absolute top-[0.45em] left-1/2 h-[0.95em] w-[3.3em] -translate-x-1/2 rounded-full bg-[#0b0c0e]" />
                <span aria-hidden className={glass} />
            </div>
        </div>
    );
}

/**
 * Kompozycja do hero: tablet z kalendarzem miesiąca, przed nim telefon z listą dnia -
 * ten sam kalendarz w dwóch rozmiarach. Pod spodem miękki cień „na blacie".
 */
export function HeroDevices() {
    return (
        <div className="relative mx-auto w-[36em] max-w-full pr-[3.5em] pb-[3em] text-[clamp(7.5px,2.35vw,14px)] lg:mr-0 lg:text-[clamp(10px,1.3vw,16.5px)]">
            <div aria-hidden className="absolute inset-x-[6%] bottom-[0.5em] h-[3em] rounded-[50%] bg-[#1f2328]/25 blur-[2.2em]" />
            <TabletFrame
                src="/v2/tablet-kalendarz.webp"
                alt="Kalendarz DetailBoost na tablecie: wizyty i rezerwacje w widoku miesiąca"
                className="shadow-[0_2.5em_4em_-1.5em_rgb(31_35_40/0.45),inset_0_0_0_1px_rgb(255_255_255/0.14),inset_0_1px_0_rgb(255_255_255/0.22)]"
            />
            <PhoneFrame
                src="/v2/telefon-kalendarz.webp"
                alt="Ten sam kalendarz na telefonie: lista wizyt na dziś"
                className="absolute right-0 bottom-0 w-[10.5em] shadow-[0_2em_3em_-1em_rgb(31_35_40/0.5),inset_0_0_0_1px_rgb(255_255_255/0.14),inset_0_1px_0_rgb(255_255_255/0.22)] motion-safe:animate-float"
            />
        </div>
    );
}
