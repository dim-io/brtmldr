# brtmldr.com, handleiding voor Bart

## Wat dit is

Je website staat als een mapje met bestanden op je eigen computer. Je zet je foto's en teksten in een paar bestanden, draait één commando, en daar komt een complete website uit in de map `dist`. Die site staat gratis online via GitHub, dus je betaalt alleen nog je domeinnaam.

## Eenmalig klaarzetten

Dit heb je eenmalig nodig op je Mac: Node.js (download de LTS-versie op nodejs.org) en cwebp, het programmaatje dat foto's omzet. Cwebp installeer je met Homebrew. Heb je Homebrew nog niet, installeer die dan eerst via brew.sh. Daarna:

```
brew install webp
```

Kijk daarna waar cwebp staat en schrijf dat pad op, dat heb je zo nodig:

```
which cwebp
```

Op de meeste Macs is dat `/opt/homebrew/bin/cwebp`.

Je hebt ook Pillow nodig. Dat is een stukje Python dat foto's verkleint voor de linkpreviews. Python zelf staat al op je Mac, Pillow nog niet:

```
python3 -m pip install Pillow
```

Zegt Terminal dat hij `python3` niet kent, dan vraagt je Mac of hij de ontwikkelaarstools mag installeren. Klik op Installeer, wacht tot hij klaar is en typ het commando opnieuw.

Alle commando's hieronder draai je vanuit de projectmap. Open Terminal, typ `cd` met een spatie erachter, sleep dan de projectmap vanuit Finder in het Terminal-venster en druk op Enter. Je staat nu in de goede map. Doe dat elke keer opnieuw als je Terminal net hebt geopend.

## Een nieuw project toevoegen

Maak eerst een map aan, bijvoorbeeld `iceland` op je bureaublad, en zet daar de JPEG's in die op de site moeten komen. Verder niets in die map, het script pakt alle JPEG- en PNG-bestanden die het tegenkomt. De volgorde op de projectpagina is de alfabetische volgorde van de bestandsnamen.

Dan is het één commando. Achter de naam van het script zet je de slug, de titel tussen aanhalingstekens, de map met de foto's en als laatste het jaartal. Het jaartal mag je weglaten.

```
sh scripts/new-project.sh iceland "Iceland" ~/Desktop/iceland 2026
```

De slug is het stukje dat in het webadres komt, hier brtmldr.com/iceland/. Alleen kleine letters, cijfers en streepjes, dus `lake-como` en niet `Lake Como`.

Het script kijkt standaard op een pad dat alleen op de Mac van Dimitri bestaat, dus op jouw Mac zegt hij bijna zeker "cwebp niet gevonden op". Zet dan het pad uit `which cwebp` vooraan het commando, precies zo:

```
CWEBP=/opt/homebrew/bin/cwebp sh scripts/new-project.sh iceland "Iceland" ~/Desktop/iceland 2026
```

Wat het script voor je doet:

1. Het zet elke foto om naar WebP in `assets/img`, in vier breedtes: 800, 1200, 1600 en 2000 pixels. Van `000123-0001.jpg` komen er dus vier bestanden, van `000123-0001-800.webp` tot en met `000123-0001-2000.webp`. Bestanden die er al staan slaat het over, dus je kunt het rustig nog eens draaien. Aan het eind werkt het script `assets/img/index.json` bij, het lijstje met de maten van alle omgezette foto's. Dat gaat vanzelf, daar hoef je nooit iets in te typen.
2. Het schrijft het projectbestand `content/projects/iceland.json`, met alle foto's erin en de eerste foto als coverfoto.
3. Het zet `"iceland"` bovenaan `homeOrder` in `content/site.json`, dus de tegel komt linksboven op de homepage.
4. Het maakt de afbeelding voor de linkpreview in `assets/og` en bouwt de site.

Daarna open je `content/projects/iceland.json` en vul je aan wat er nog mist: het jaartal, de regel met je camera en het filmpje, het intro, de zin voor Google en de alt-teksten. Wat elk veld doet staat in het volgende hoofdstuk. Bouw daarna opnieuw:

```
node build.mjs
```

Kijk de nieuwe pagina altijd even na, zie "De site lokaal bekijken".

## Het projectbestand

In de map `content/projects` staat per project één bestand. Zo ziet een project met drie foto's eruit:

```
{
 "slug": "iceland",
 "title": "Iceland",
 "year": "2026",
 "meta": "Leica M6, Portra 400",
 "intro": "Twee weken in de winter, met de auto langs de zuidkust.",
 "weight": 0.9,
 "description": "Analogue photographs from Iceland by Bart Mulder: black beaches and empty roads, all shot on film.",
 "cover": "000123-0001",
 "images": [
  "000123-0001",
  {
   "file": "000123-0002",
   "alt": "Waves breaking on a dark beach at dusk."
  },
  "000123-0003"
 ]
}
```

Wat de velden betekenen:

- `slug`: het stukje dat in het webadres komt, hier brtmldr.com/iceland/. De site kijkt naar dit veld, niet naar de bestandsnaam. Geef het bestand toch dezelfde naam, dan blijft het overzichtelijk en klaagt de site niet.
- `title`: de naam zoals hij op de site staat.
- `year`: het jaartal, tussen aanhalingstekens. Het komt achter de titel te staan, zo: madeira | 2023. Wil je er geen jaartal bij, laat dan `""` staan.
- `meta`: een extra regeltje onder de titel op de projectpagina, bijvoorbeeld je camera en het filmpje. Wil je daar niets, laat dan `""` staan, dan blijft de regel weg.
- `intro`: twee of drie zinnen onder de titel op de projectpagina. Mag ook leeg blijven met `""`.
- `weight`: hoe breed de tegel van dit project op de homepage wordt. Een getal tussen 0.6 en 1, zonder aanhalingstekens. 1 is de breedste tegel, 0.6 de smalste. Vul je hier niets in, dan wordt het 1. Door de getallen per project te variëren krijg je het verspringende raster.
- `description`: één zin voor Google, en voor het tekstje dat verschijnt als iemand je link deelt in WhatsApp of op Instagram.
- `cover`: de foto die als tegel op de homepage komt. Vul hier dezelfde naam in als bij een van de foto's hieronder.
- `images`: de foto's, in de volgorde waarin ze op de pagina komen.

Een foto schrijf je op twee manieren op. Heb je geen alt-tekst, dan zet je alleen de bestandsnaam tussen aanhalingstekens. Heb je er wel een, dan maak je er een blokje van met `file` en `alt`. Allebei door elkaar in dezelfde lijst mag.

- `file`: de naam van de foto zonder `.jpg` en zonder `-800`, `-1200`, `-1600` of `-2000`. Dus `000123-0001`, niet `000123-0001-1600.webp`. Bij het omzetten schoont het script de namen op: spaties, plustekens en andere rare tekens worden een streepje. `Test Foto 1.jpg` staat in het projectbestand dus als `Test-Foto-1`. Twijfel je, kijk dan in `assets/img` hoe het bestand daar heet.
- `alt`: een korte beschrijving van wat er op de foto staat, voor mensen die de foto niet kunnen zien. Weet je even niets, schrijf de foto dan als alleen de bestandsnaam tussen aanhalingstekens. Bij het bouwen telt de site hoeveel foto's zonder alt-tekst zitten en zegt dat erbij. Hij vult er dan zelf een beschrijving in, in de trant van "Analogue photograph 2 of 8 from the Iceland series by Bart Mulder". Dat werkt, maar je eigen zin is beter.

De breedte en hoogte van een foto vul je niet meer in. Die haalt de site uit `assets/img/index.json`. Dat lijstje schrijft `scripts/images.sh` zelf bij zodra het foto's heeft omgezet, dus je hoeft het nooit aan te vullen of te openen. Het veld `type` bestaat ook niet meer. Kom je het nog ergens tegen in een oud bestand, dan mag die regel weg.

Let op de komma's: tussen twee foto's staat een komma, achter de laatste foto niet. Alles tussen aanhalingstekens, behalve het getal bij `weight`.

## Tekst of contactgegevens aanpassen

De tekst die je zelf invult staat in `content/site.json`. Je past daar aan wat tussen de aanhalingstekens staat, verder niets.

- `email`: je e-mailadres, dat zit achter het envelopje in het menu en op de about-pagina.
- `instagram` en `instagramHandle`: de link en de naam die erbij staat.
- `tagline`: de regel met je naam, je vak en je woonplaats. Die staat bovenaan de homepage en onderaan elke pagina in de footer.
- `footer`: de regel onderaan elke pagina, nu `© Bart Mulder`. Het jaartal zet de site er zelf achter, dus dat hoef je nooit bij te werken.
- `description` en `seoTitle`: wat Google van de homepage laat zien.
- `homeOrder`: de volgorde van de tegels op de homepage, zie het volgende hoofdstuk.
- `redirects`: oude webadressen die naar een nieuw adres moeten wijzen. Links het oude pad, rechts het nieuwe, bijvoorbeeld `"/home/": "/"`. Iemand die het oude adres opent, komt meteen op het nieuwe uit.
- `about.bio`: je verhaal, drie regels tussen aanhalingstekens, elke regel wordt één alinea.
- `about.publications`, `about.collaborations`, `about.licensingClients`: de drie lijstjes op de about-pagina. Een naam toevoegen doe je door een nieuw blokje met `name` en `url` toe te voegen, met komma's tussen de blokjes.
- `about.licensing`: het e-mailadres en de link van Kintzing.
- `about.portrait`: je portretfoto rechts op de about-pagina.
- `about.seoTitle` en `about.description`: wat Google van de about-pagina laat zien.

Bovenaan het bestand staan `title`, `name`, `domain` en `url`. Die laat je staan. `domain` is de naam die in het bestand `CNAME` terechtkomt, en `url` zit in elke link die de site naar zichzelf maakt.

De vaste woorden op de site staan niet in dit bestand maar in `build.mjs`: de menuknoppen projects en about, de kopjes op de about-pagina, en de woorden previous en next onderaan een project. Wil je daar iets aan veranderen, bel Dimitri.

Daarna bouwen:

```
node build.mjs
```

## Volgorde op de homepage of de coverfoto veranderen

De volgorde van de tegels op de homepage is precies de volgorde van `homeOrder` in `content/site.json`. Zet de regels in die lijst in de volgorde die je wilt, en let erop dat achter elke regel een komma staat behalve de laatste. Staat een project niet in die lijst, dan is de pagina niet te vinden via het menu, de homepage of de sitemap. De site waarschuwt je daarvoor bij het bouwen.

De coverfoto van een project verander je in het bestand van dat project in `content/projects`. Zet bij `cover` de naam van een andere foto uit de lijst `images`. Staat er een naam die niet in de lijst voorkomt, dan pakt de site de eerste foto en zegt dat erbij.

Verander je een coverfoto, gooi dan ook het oude linkpreview-plaatje weg: verwijder `assets/og/iceland.jpg` (met de slug van dat project in de naam) en draai daarna opnieuw:

```
python3 scripts/og.py
```

Doe je dat niet, dan blijft de oude foto in WhatsApp en op Instagram verschijnen.

Daarna bouwen:

```
node build.mjs
```

## Een project een ander webadres geven

Stel dat `frenchalps2` netter `french-alps-2` moet worden. Dat gaat in vijf stappen, en de oude link blijft gewoon werken.

1. Hernoem het bestand in `content/projects`, dus `frenchalps2.json` wordt `french-alps-2.json`.
2. Zet in dat bestand bij `slug` diezelfde nieuwe naam.
3. Zet het oude pad erbij in een lijst `aliases`, bijvoorbeeld onder de regel met `cover`:

```
 "aliases": [
  "/frenchalps2/"
 ],
```

4. Vervang de oude slug door de nieuwe in `homeOrder` in `content/site.json`.
5. Het plaatje voor de linkpreview staat op naam van de slug, dus dat moet opnieuw. Verwijder `assets/og/frenchalps2.jpg` en draai:

```
python3 scripts/og.py
```

Bouw daarna opnieuw. Op het oude adres komt nu een pagina te staan die de bezoeker meteen doorstuurt naar het nieuwe. Zo raak je bezoekers en zoekresultaten van de oude link niet kwijt.

## De fotoviewer

Klik op een projectpagina op een foto, dan gaat hij schermvullend open. Bladeren doe je met de pijlen naast de foto, met de pijltjestoetsen, of door op je telefoon te vegen. Klikken op de rechterhelft van de foto gaat vooruit, op de linkerhelft terug. Sluiten doe je met de kruisjesknop, met Escape, door naast de foto te klikken, of met de terugknop van je browser.

Het webadres verandert mee terwijl je bladert, dus je kunt naar één foto linken. Het adres brtmldr.com/madeira/#photo-4 opent de pagina met foto 4 meteen open.

## De site lokaal bekijken

Dit commando bouwt de site en start meteen een klein webservertje erbij:

```
npm run serve
```

Open dan http://localhost:8765 in je browser. Stoppen doe je met Ctrl en C in het Terminal-venster. Zie je een oude versie, ververs de pagina dan met Cmd en Shift en R.

De map `dist` wordt bij elke bouw geleegd, maar niet weggegooid. Laat de server dus gerust draaien, bouw in een tweede Terminal-venster opnieuw met `node build.mjs` en ververs je browser.

## Waar de site voor waarschuwt

Na `node build.mjs` zegt hij hoeveel pagina's en foto's hij heeft gebouwd. Alles wat daarboven met "Let op" begint is een waarschuwing. De site bouwt gewoon door, maar er klopt iets niet:

- Foto's zonder eigen alt-tekst. Hij telt ze en vult er zelf een beschrijving in.
- Een project dat niet in `homeOrder` staat in `content/site.json`, en dus niet te vinden is via het menu, de homepage of de sitemap.
- Een `cover` die niet voorkomt in de fotolijst van dat project. Hij gebruikt dan de eerste foto.
- Een foto die niet in `assets/img` staat en dus nog niet is omgezet. Die foto slaat hij over. Meestal is de naam bij `file` verkeerd overgetypt, of is `scripts/images.sh` nog niet over die map gegaan.
- `assets/img/index.json` ontbreekt of is leeg. Dan is er nog geen enkele foto omgezet. Draai `scripts/images.sh` over je fotomap, dat bestand komt er dan vanzelf bij.
- Een naam in `homeOrder` waar geen projectbestand bij hoort. Meestal een typefout, of een project dat je hebt weggehaald zonder de regel uit `homeOrder` te halen.

Staat er een fout in een JSON-bestand, dan stopt hij en noemt hij het bestand en het regelnummer. Kijk dan rond die regel naar een ontbrekende of overbodige komma, een aanhalingsteken of een accolade.

## Publiceren via GitHub Pages

GitHub Pages is de gratis hostingdienst van GitHub. In het project zit al een instructiebestand (in de map `.github`) dat GitHub vertelt hoe hij de site moet bouwen. Je zet dus je bronbestanden online, GitHub draait `node build.mjs` zelf en publiceert het resultaat. De map `dist` gaat niet mee naar GitHub, die wordt daar opnieuw gemaakt.

Dimitri doet de eerste publicatie samen met jou. De hoofdlijn:

1. Maak een gratis account op github.com en daar een repository aan, bijvoorbeeld `brtmldr`. Een repository is de opslagplek van je project bij GitHub.
2. Zet de bestanden uit de projectmap in die repository, op de branch `main`. Een branch is een lijn in je project, `main` is de standaardlijn. Het instructiebestand reageert alleen op `main`, dus die naam moet kloppen. De map `dist` gaat niet mee, die staat in het bestand `.gitignore`.
3. Ga in de repository naar het tabblad Settings bovenaan, klik links op Pages, en kies bij Source de optie GitHub Actions, dus niet "Deploy from a branch".
4. Klik op het tabblad Actions bovenaan de repository. Daar staat je laatste publicatie in de lijst. Wordt het bolletje ervoor groen, dan is de site gebouwd en staat hij online. Wordt het rood, klik erop en stuur Dimitri wat er staat.
5. Vul bij Custom domain (je eigen domeinnaam) `www.brtmldr.com` in, met www ervoor: dat is het adres dat de site zelf als hoofdadres gebruikt, en brtmldr.com zonder www stuurt GitHub daar automatisch naartoe. Het bestand `CNAME` met die naam erin maakt `node build.mjs` elke keer opnieuw aan, daar hoef je niets voor te doen. GitHub blijft klagen zolang brtmldr.com nog naar Squarespace wijst, dat regel je in de volgende stap. Zet daarna Enforce HTTPS aan, zodra GitHub zegt dat het certificaat klaar is. Dat duurt soms een uur.

Voor schermafbeeldingen en de exacte knoppen: docs.github.com/pages. Die pagina's zijn Engels, maar GitHub houdt ze zelf bij, dus ze kloppen altijd met wat je op je scherm ziet.

Vanaf dan gaat het zo: je past de bestanden in `content` aan, je kijkt het lokaal na, en je stuurt je wijziging naar GitHub. Dat laatste doe je vanuit de projectmap met drie commando's. Eerst alle gewijzigde bestanden klaarzetten:

```
git add -A
```

Dan er een naam aan hangen, tussen de aanhalingstekens schrijf je zelf wat je hebt gedaan:

```
git commit -m "project iceland toegevoegd"
```

En dan versturen:

```
git push
```

GitHub bouwt de site daarna zelf opnieuw. Kijk bij Actions of het bolletje groen wordt, na een minuut of twee staat de nieuwe versie online.

## Het domein losmaken van Squarespace

Doe dit in deze volgorde. Zeg je eerst je abonnement op, dan is je oude site offline terwijl de nieuwe nog niet werkt.

1. **Wacht tot de nieuwe site staat.** Pas als GitHub je site heeft gebouwd en je alles hebt nagekeken, ga je verder.
2. **Pas de DNS aan bij Squarespace.** DNS bepaalt naar welke computer je domeinnaam verwijst. Log in bij Squarespace, ga naar de instellingen van het domein brtmldr.com en zoek de DNS-instellingen. Vervang de bestaande A-records door deze vier, die naar GitHub wijzen:

   - 185.199.108.153
   - 185.199.109.153
   - 185.199.110.153
   - 185.199.111.153

   Vervang daarnaast het bestaande record voor `www` door een CNAME-record dat verwijst naar `<gebruikersnaam>.github.io`, met je eigen GitHub-gebruikersnaam op de plek van `<gebruikersnaam>`. Laat geen oude records voor `www` staan, want met twee records naast elkaar komt de ene bezoeker op de nieuwe site en de andere op de oude. Het duurt tot een paar uur voor de wijziging overal op internet is verwerkt.
3. **Controleer dat brtmldr.com de nieuwe site laat zien.** Test ook op je telefoon met wifi uit, dan weet je zeker dat je niet naar een oude versie uit je eigen browser kijkt.
4. **Zeg pas nu het Squarespace-websiteabonnement op.** Dat is het bedrag dat je nu maandelijks aan Squarespace betaalt, ongeveer 18 euro. Doe dit niet eerder.
5. **Het domein zelf.** Dat kun je bij Squarespace Domains laten staan en apart blijven betalen, of verhuizen naar een andere partij. Verhuizen hoeft niet, je site werkt ook als het domein bij Squarespace blijft. Kies je toch voor verhuizen, doe dat dan pas als alles rustig draait.

## Veelgestelde vragen

**Ik wil één foto van een pagina halen.**
Open het bestand van dat project in `content/projects` en haal die foto uit de lijst `images`. Staat er alleen een naam, dan haal je die regel weg. Staat er een blokje met `file` en `alt`, dan haal je alles van de `{` tot en met de `}` weg. Let op de komma die erbij hoort. Was het toevallig de coverfoto, zet dan bij `cover` een andere naam uit de lijst en ververs het linkpreview-plaatje zoals hierboven beschreven staat. Daarna `node build.mjs`. Het WebP-bestand in `assets/img` mag blijven staan, dat doet geen kwaad.

**Ik wil een foto toevoegen aan een project dat al bestaat.**
Zet die foto in een map, bijvoorbeeld `extra` op je bureaublad, en zet hem om:

```
sh scripts/images.sh ~/Desktop/extra
```

Zegt hij ook hier "cwebp niet gevonden op", zet er dan `CWEBP=` met je eigen pad voor, net als bij een nieuw project. Kijk daarna in `assets/img` hoe het bestand heet, laat `-800` tot en met `-2000` en `.webp` weg, en zet die naam in de lijst `images` van dat project, op de plek waar je de foto wilt hebben. Daarna `node build.mjs`.

**Ik wil een heel project weghalen.**
Verwijder het bestand uit `content/projects` en haal de slug uit `homeOrder` in `content/site.json`. Doe allebei: haal je alleen de slug uit `homeOrder`, dan verdwijnt de tegel wel van de homepage, maar de pagina zelf blijft bestaan.

**Ik wil de oude crèmekleurige achtergrond terug.**
Open `build.mjs` en zoek de regel `<html lang="en" class="no-js">`. Maak daarvan:

```
<html lang="en" class="no-js" data-theme="cream">
```

Daarna `node build.mjs`. De kleuren zelf staan in `src/style.css`, bij de opmerking over de crème-variant. Bevalt het niet, haal `data-theme="cream"` er dan weer af en bouw opnieuw.

**Er gaat iets mis en ik kom er niet uit.**
Bel of app Dimitri. Stuur de foutmelding uit Terminal erbij, dan is het meestal zo opgelost.
