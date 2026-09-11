#!/bin/sh
# Nieuw project toevoegen in één stap.
# Gebruik: sh scripts/new-project.sh <slug> "Titel" <map met foto's> [jaar]
# Voorbeeld: sh scripts/new-project.sh sicily "Sicily" ~/Pictures/sicily 2026
# Doet: foto's omzetten naar WebP, projectbestand schrijven, slug aan homeOrder toevoegen, linkpreview maken, site bouwen.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SLUG="$1"; TITLE="$2"; SRC="$3"; YEAR="${4:-}"
if [ -z "$SLUG" ] || [ -z "$TITLE" ] || [ -z "$SRC" ]; then
  echo "Gebruik: sh scripts/new-project.sh <slug> \"Titel\" <map met foto's> [jaar]"; exit 1
fi
case "$SLUG" in *[!a-z0-9-]*) echo "De slug mag alleen kleine letters, cijfers en streepjes bevatten, bijvoorbeeld lake-como."; exit 1;; esac
if [ ! -d "$SRC" ]; then echo "Map niet gevonden: $SRC"; exit 1; fi
if [ -f "$ROOT/content/projects/$SLUG.json" ]; then echo "Er bestaat al een project met slug $SLUG. Kies een andere slug of verwijder eerst content/projects/$SLUG.json."; exit 1; fi

echo "1/4 Foto's omzetten..."
sh "$ROOT/scripts/images.sh" "$SRC"

echo "2/4 Projectbestand schrijven..."
python3 - "$ROOT" "$SLUG" "$TITLE" "$SRC" "$YEAR" <<'PY'
import json, os, sys, re
root, slug, title, src, year = sys.argv[1:6]
exts = ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG')
files = sorted(f for f in os.listdir(src) if f.endswith(exts))
if not files:
    print("Geen JPEG- of PNG-bestanden gevonden in", src); sys.exit(1)
index = json.load(open(f"{root}/assets/img/index.json"))
names = []
for f in files:
    base = re.sub(r'^-|-$', '', re.sub(r'-+', '-', re.sub(r'[^A-Za-z0-9._-]+', '-', os.path.splitext(f)[0])))  # zelfde regel als images.sh
    if base not in index:
        print("Overgeslagen, niet in assets/img/index.json:", f); continue
    names.append(base)
project = {"slug": slug, "title": title, "year": year, "meta": "", "intro": "", "weight": 1,
           "description": f"{title}: analogue travel and landscape photographs by Bart Mulder.",
           "cover": names[0], "images": names}
json.dump(project, open(f"{root}/content/projects/{slug}.json", "w"), indent=1, ensure_ascii=False)
site = json.load(open(f"{root}/content/site.json"))
if slug not in site["homeOrder"]:
    site["homeOrder"].insert(0, slug)   # nieuwste project bovenaan; verplaats in site.json als je wilt
json.dump(site, open(f"{root}/content/site.json", "w"), indent=1, ensure_ascii=False)
print(f"content/projects/{slug}.json geschreven met {len(names)} foto's; {slug} staat bovenaan homeOrder in content/site.json.")
PY

echo "3/4 Linkpreview maken..."
python3 "$ROOT/scripts/og.py"

echo "4/4 Site bouwen..."
node "$ROOT/build.mjs"
echo "Klaar. Pas eventueel year, meta, intro, description en cover aan in content/projects/$SLUG.json en bouw opnieuw met: node build.mjs"
