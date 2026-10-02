// capture/device.mjs
// Geometria urządzeń w kadrze 1440 × 900: ten sam rachunek składa klatki (recorder)
// i przelicza obszary ramek kroków (lib.beat), więc ramka trafia w to samo miejsce.
export const FRAME = { width: 1440, height: 900 };

export const DEVICES = {
    // Telefon klienta na rozmytym ekranie studia (strona podpisu z linku SMS).
    phone: { heightShare: 0.9, bezel: 12, radius: 38, overlay: true },
    // Tablet w recepcji (przyjęcie pojazdu), poziomo.
    tablet: { heightShare: 0.9, bezel: 18, radius: 30 },
    // Ten sam tablet obrócony pionowo i podany klientowi do podpisu - na rozmytym
    // ekranie przyjęcia, jak telefon przy wydaniu.
    'tablet-portrait': { heightShare: 0.95, bezel: 16, radius: 30, overlay: true },
};

/** Położenie ekranu urządzenia w kadrze dla okna strony `vp`. */
export function deviceLayout(kind, vp) {
    const d = DEVICES[kind];
    const outerH = Math.round(FRAME.height * d.heightShare);
    let scale = (outerH - d.bezel * 2) / vp.height;
    // Tablet poziomo: ogranicza go też szerokość kadru.
    scale = Math.min(scale, (FRAME.width * 0.94 - d.bezel * 2) / vp.width);
    const sw = Math.round(vp.width * scale);
    const sh = Math.round(vp.height * scale);
    const ow = sw + d.bezel * 2;
    const oh = sh + d.bezel * 2;
    const ox = Math.round((FRAME.width - ow) / 2);
    const oy = Math.round((FRAME.height - oh) / 2);
    return { ...d, scale, sw, sh, ow, oh, ox, oy, sx: ox + d.bezel, sy: oy + d.bezel };
}
