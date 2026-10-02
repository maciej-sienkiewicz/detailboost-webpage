import { DotField } from './DotField';

/**
 * Tło pierwszego ekranu, pod paskiem nawigacji i Hero: siatka kropek z wędrującym
 * światłem i dwie bardzo wolne poświaty. Wszystko wygasa ku dołowi w jednolitą czerń,
 * żeby okno aplikacji i treść poniżej stały na spokojnym tle, a nie na animacji.
 */
export function Backdrop() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(1400px,140vh)] overflow-hidden">
            {/* Ciepła poświata za nagłówkiem: złoto z logo, rozlane i ledwo żywe. */}
            <div className="absolute top-[-18%] left-1/2 h-[70%] w-[80%] -translate-x-1/2 animate-drift-a rounded-[50%] bg-[radial-gradient(closest-side,rgb(220_174_92/0.16),transparent)] blur-2xl" />
            {/* Chłodny kontrapunkt z boku - bez niego złoto wygląda jak plama. */}
            <div className="absolute top-[22%] left-[-12%] h-[55%] w-[50%] animate-drift-b rounded-[50%] bg-[radial-gradient(closest-side,rgb(200_210_230/0.07),transparent)] blur-2xl" />
            <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_32%,#000_35%,transparent_80%)]">
                <DotField />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-void" />
        </div>
    );
}
