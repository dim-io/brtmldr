# Plan: brtmldr.com nabouwen als statische site

Datum: 2026-09-11. Opgesteld door Claude (Fable) voor Dimitri, voor Bart Mulder.

## Doel

Barts Squarespace-site (18 euro per maand) vervangen door een statische site met dezelfde content, in de stijl van timbuiting.com, die gratis gehost kan worden. Bart betaalt daarna alleen nog zijn domeinnaam.

## Inventaris van de bron (brtmldr.com)

- 11 pagina's: home, Contact & About en 9 projectpagina's: French Alps, French Alps 2, Mallorca, The Netherlands, Mont Blanc, Lake Garda, Dolomites, Faro, Madeira.
- Home is een masonry-raster met 72 foto's zonder links. De projectpagina's tonen samen 104 foto's in uitgelijnde rijen ("strips").
- 116 unieke foto's in totaal, waarvan 12 alleen op de homepage staan.
- Navigatie: map "Work" (leeg), map "Personal" (alle 9 projecten), Contact & About, e-mail-icoon, Instagram-icoon (@brt_mldr).
- Tekst: bio in drie alinea's, lijst met publicaties, samenwerkingen en beeldlicenties, e-mail brtmldr@icloud.com, licensing via Kintzing, voettekst "© BRTMLDR 2026."
- Huisstijl nu: crème achtergrond, donkerblauwe tekst, lettertypen Manrope en Nunito Sans, logo "brtmldr" als png, favicon.

## Wat we van Tim overnemen

- Witte achtergrond, zwarte tekst, vet woordmerk links, kleine nav in kleine letters rechts met Instagram-icoon.
- Home: verspringende collage in twee kolommen van projecttegels, elk met bijschrift "**naam** | type".
- Projectpagina: gecentreerde titel "**naam** | type", daaronder een galerij in uitgelijnde rijen met smalle tussenruimte.
- About: tekst links, portret rechts.

## Ontwerpkeuzes

1. Structuur van Tim, identiteit van Bart. We gebruiken Barts eigen logo, zijn lettertypen (Manrope voor koppen, Nunito Sans voor lopende tekst, beide gratis via Google Fonts) en zijn favicon. Tims lettertype aktiv-grotesk is een betaald Adobe-font en nemen we niet over.
2. Kleur: wit met bijna-zwart, zoals Tim. Barts donkerblauw blijft in het logo zitten. De crème-variant staat klaar als één CSS-variabele voor als Bart die liever houdt.
3. Home toont de 9 projecten als tegels. De coverfoto is de eerste foto van elk project. Bijschrift wordt bijvoorbeeld "mallorca | personal", omdat alle projecten bij Bart onder "Personal" vallen.
4. De 12 foto's die alleen op de oude homepage stonden krijgen een eigen pagina "selected", zodat er geen content verloren gaat.
5. Projectpagina's houden de originele fotovolgorde.
6. Navigatie: work (terug naar home), about, e-mail, Instagram. Op mobiel een hamburger-menu. Dit is de enige JavaScript op de site.
7. Foto's worden geleverd als WebP in twee breedtes (1600 en 800 pixels) met srcset. Breedte en hoogte staan in de HTML zodat de pagina niet verspringt tijdens laden.

## Techniek

- Generator: één Node-script (`build.mjs`) zonder dependencies. Leest `content/site.json` en `content/projects/*.json`, schrijft `dist/`.
- Foto-pipeline: `scripts/images.sh` zet de originelen om naar WebP met cwebp.
- Hosting: GitHub Pages met een `CNAME` voor brtmldr.com. Cloudflare Pages of Netlify werken ook met dezelfde `dist/`-map.
- Kosten na migratie: alleen het domein (circa 12 tot 20 euro per jaar).

## Stappen

| # | Stap | Wie | Status |
|---|------|-----|--------|
| 1 | Bron en inspiratie verkennen, plan schrijven | Fable | klaar |
| 2 | Content naar JSON (teksten, projecten, fotovolgorde, alt-teksten) | Fable | klaar |
| 3 | Foto's omzetten naar WebP in twee breedtes | Opus-subagent | klaar |
| 4 | Generator, templates en CSS bouwen | Fable | klaar |
| 5 | Bouwen en visueel controleren op desktop en mobiel, links en afbeeldingen checken | Fable, review door Opus | klaar, 14 van 15 reviewpunten verwerkt |
| 6 | Handleiding voor Bart: project toevoegen, publiceren, domein verhuizen, Squarespace opzeggen | Opus schrijver plus Opus reviewer | klaar (README.md) |
| 7 | Git-repo en GitHub Pages voorbereiden. Publiceren pas na akkoord van Dimitri en Bart | Fable | voorbereid: git init, workflow, CNAME. Nog niet gecommit of gepubliceerd |

## Buiten scope

- Webshop of prints (Bart heeft die niet).
- Contactformulier (Bart gebruikt een mailto-link).
- Domeinverhuizing zelf uitvoeren: dat vraagt inloggen bij Squarespace en de registrar, dat doet Bart zelf met de handleiding.

## Afwijkingen van het plan

- Het review-advies om ook een 2400 px-variant van elke foto te maken is niet uitgevoerd: dat verdubbelt de laadtijd op grote schermen en de repo-omvang. 1600 px is op een retinascherm van 1180 px breed licht zacht, maar snel.
- De oude Squarespace-metabeschrijvingen per project zijn ongewijzigd overgenomen. Ze zijn wij-vorm en generiek; Bart kan ze zelf herschrijven in content/projects/*.json.
- 62 van de 116 foto's hadden op de oude site geen alt-tekst. De site vult die nu automatisch met een beschrijving per reeks; de build waarschuwt zodat Bart ze kan aanvullen.

## Ronde 2: kritische review en verbeterplan (2026-09-11, avond)

Bron: eigen doorloop plus een onafhankelijke Opus-review van de huidige build. Gesorteerd op wat de site het meest beter maakt.

### A. Direct uit te voeren, geen input van Bart nodig

| # | Wat | Waarom | Moeite |
|---|-----|--------|--------|
| A1 | Foto's scherp op tablet: in `sizesFor` de grens van 700 naar 1000 px | Tussen 700 en 1000 px kiest de browser nu een te kleine variant, elke projectfoto is daar zichtbaar zacht | klein |
| A2 | Extra breedte 1200 px en 2000 px genereren, kwaliteit 78 met sharp_yuv; 2000 alleen voor de viewer | Telefoons halen nu de 1600-versie (gem. 455 kB), Madeira kost 13 MB; de viewer is op retina net te zacht | middel |
| A3 | Homepage terug naar twee kolommen, maar compacter dan de eerste versie: kleinere tegels (60 tot 85 procent), vaste verspringing, kleinere rijafstand | Drie kolommen geeft postzegels op 1920 px, gaten rechts en een weestegel onderaan; twee kolommen met 10 tegels sluit netjes | middel |
| A4 | Naam zichtbaar maken: één stille regel "Bart Mulder, analogue travel and landscape photography, Haarlem" onder de header op home en in de footer; "Bart Mulder" in de paginatitels | Nergens op de site staat nu wie de fotograaf is, behalve op about | klein |
| A5 | Pijltjestoetsen alleen in de fotoviewer, niet meer tussen projecten | Springt nu zonder waarschuwing naar een andere pagina | klein |
| A6 | Fotoviewer: aria-live op de teller, pijlen ook op mobiel (klein, onderin), klik op de foto bladert door, terugknop sluit de viewer via een hash in de URL | Schermlezers merken niets, mobiel weet niet dat swipen kan, terugknop verlaat nu de pagina | klein |
| A7 | Mobiel: twee staande foto's naast elkaar als ze op elkaar volgen | Madeira is op een telefoon 14.000 px scrollen in één kolom | middel |
| A8 | Menu zonder JavaScript bruikbaar (no-js klasse) | Zonder script is op mobiel geen enkele link bereikbaar | klein |
| A9 | Breedte en hoogte uit `assets/img/index.json` halen, `w`/`h` in de JSON optioneel; `images` mag een lijst bestandsnamen zijn | Bart hoeft geen 58 getallen over te tikken; een tikfout snijdt nu stil een foto bij | middel |
| A10 | Build waarschuwt bij project buiten `homeOrder`, onbekende `cover`, ontbrekend fotobestand, en legt een JSON-fout uit met bestand en regel | Fouten die Bart gaat maken zijn nu stil of onleesbaar | klein |
| A11 | Script `scripts/new-project.sh <slug> "Titel" <map met foto's>`: zet om, maakt og-JPEG, schrijft het JSON-bestand, zet de slug in `homeOrder` | Eén commando in plaats van vijf stappen uit de README | middel |
| A12 | CSS en JS met inhoudshash in de bestandsnaam | Terugkerende bezoekers krijgen anders oude opmaak uit de cache | klein |
| A13 | Slug `frenchalps2` wordt `french-alps-2`, oude URL verwijst door | Consistent met de rest | klein |
| A14 | Paginatitels "Madeira, analogue photography by Bart Mulder"; ImageGallery structured data per project; onder de pager één regel "prints and licensing" met het mailadres | Zoekwoorden en licentiecontact zitten nu alleen op about | klein |
| A15 | Jaartal in de footer automatisch; hairlijn onder de sticky header zodra je scrolt; view transitions tussen pagina's | Afwerking | klein |
| A16 | Logo als SVG in plaats van PNG | Strak op elk scherm | klein, als er een tracer beschikbaar is |

### B. Vraagt input van Bart (content)

| # | Wat | Vraag aan Bart |
|---|-----|----------------|
| B1 | Per serie een regel context: plek, jaar, camera, film. Optioneel twee zinnen intro | Voor elke serie: waar, wanneer, waarmee geschoten, en waarom deze foto's bij elkaar horen |
| B2 | Eigen metabeschrijving per project (nu Squarespace-teksten in wij-vorm, met "Burt Mulder" in French Alps 2 en drie identieke teksten) | Ik schrijf tien voorstellen op basis van B1; Bart keurt |
| B3 | Alt-teksten voor de 62 foto's zonder beschrijving | Kan later, de fallback dekt het nu |

### C. Keuzes voor Dimitri en Bart

- **C1 Aantal series.** "French Alps" en "French Alps 2" naast elkaar, plus "Selected" als tiende, leest als een archief. Voorstel: de twee Alpen-sets samenvoegen (met jaartal in de titel als het verschillende reizen zijn) en "Selected" houden of laten vallen. Acht sterke series is beter dan tien.
- **C2 Label "personal".** Staat achter elk project en zegt daardoor niets. Alternatief: het jaartal ("madeira | 2023") of de plek weglaten uit het label en alleen de titel tonen.
- **C3 Twee of drie kolommen** op de homepage (A3). Mijn advies is twee, compacter dan de eerste versie.

### Status (2026-09-11, laat)

Uitgevoerd: A1 tot en met A15. A16 (SVG-logo) wacht op Barts originele logobestand; er staat geen tracer op deze machine. Jaartal (C2) is als veld ingebouwd maar leeg gelaten: de originelen bevatten geen opnamedatum, dus Bart vult het zelf in. Series blijven zoals ze zijn (C1). B1 en B3 wachten op Bart; B2 (metabeschrijvingen) is door een Opus-schrijver gedaan en gereviewd.

### Volgorde

1. A1, A2, A5, A6, A8, A10, A12 (techniek en scherpte, direct effect).
2. A3, A4, A15 (ontwerp).
3. A9, A11, A13, A14, A16 (onderhoud en SEO).
4. B1 en B2 zodra Bart antwoordt; C1 en C2 na jullie keuze.

## Parkeerplaats (2026-09-11, na ronde 2)

Bewust nog niet opgepakt, op verzoek van Dimitri. Voor later:

- **De site heeft nog geen stem.** Per serie ontbreekt context: jaar, camera, film, twee zinnen intro. De velden `year`, `meta` en `intro` staan klaar in content/projects/*.json. Alleen Bart kan dit vullen.
- **Covers nalopen.** Twee kolommen met vaste verspringing is veilig; het werkt pas echt als elke cover een uithangbord is. Twijfelgevallen: de lantaarnpalen van Mallorca, de groene kratten van French Alps 2. Keuze voor Bart.
- **Titels "French Alps 2" en "Selected".** Een cijfer achter een titel leest als verlegenheid. Eén woord verschil (bijvoorbeeld de plek, "alpe d'huez") lost het op.
- **Logo als SVG.** Nu een PNG van 640 px breed; op retina net niet zo strak als de rest. Vraagt Barts originele logobestand.
- **Handmatig doorklikken in een echte browser.** Alles is getest met headless Chrome en code-review; hover op het projectenmenu, blur bij scrollen en swipen in de viewer zijn nagebootst, niet gevoeld.
- Verwijderd op verzoek: de regel "prints and licensing" onder elke serie en de naamregel in de footer. De naamregel onder de header op de homepage blijft.
