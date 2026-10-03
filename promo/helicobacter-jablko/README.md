# H. pylori kontra jabłko — reklama Zdrowo też Smacznie

20-sekundowa animacja 3D (pion 1080×1920, 30 kl./s) pod Reels/Stories dla
[zdrowotezsmacznie.pl](https://zdrowotezsmacznie.pl/): bakteria *Helicobacter pylori*
jako fioletowy spiralny robaczek zostaje zmiażdżona przez jabłko.

Gotowy film: `helicobacter-jablko.mp4`.

## Scenariusz

| czas | scena |
|---|---|
| 0–3,3 s | przelot nad błoną śluzową żołądka, pytania „Zgaga? Ból brzucha? Wzdęcia?” → „Coś Cię gryzie od środka?” |
| 3,3–8 s | bakteria wyskakuje ze śluzówki, tytuł HELICOBACTER PYLORI (glitch), wokół krążą objawy |
| 8–10,7 s | „Na szczęście jest na niego sposób…”, z góry w snopie światła zstępuje jabłko, bakteria panikuje („O-o…”) |
| 10,7–12,9 s | upadek z liniami prędkości, uderzenie: CHRUP!, fala uderzeniowa, glutki, wstrząs kamery |
| 12,9–16,4 s | żołądek „zdrowieje” (paleta marki), bakteria z oczami X, „Dieta, która wspiera leczenie H. pylori” |
| 16,4–20 s | plansza końcowa: logo, Anna Daczkowska, UMÓW KONSULTACJĘ, strona i Instagram |

Kolory i krój (Poppins) wzięte ze strony: pomarańcz `#F29650`, zieleń `#ABC765`,
ciemna zieleń `#1E4D2A`, krem `#FFFAF6`.

## Podgląd i render

- Podgląd na żywo: serwer statyczny w tym katalogu (np. `npx serve .`) i `index.html`;
  `index.html?t=11.6` zatrzymuje kadr w danej chwili.
- Render MP4 (Chromium + ffmpeg, three i playwright-core w `node_modules`):

```sh
npm i --no-save playwright-core three
node render.mjs                     # -> out/helicobacter-jablko.mp4
node render.mjs --stills 4.6,11.6   # pojedyncze klatki do sprawdzenia
```

Teksty, czasy i kamerę zmienia się w `index.html` (`renderUI`, `cameraState`, `appleState`).
