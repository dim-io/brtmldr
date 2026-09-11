#!/usr/bin/env bash
# Zet originele foto's om naar WebP op vier breedtes (2000, 1600, 1200 en 800 px).
# Gebruik: scripts/images.sh [invoermap]
# Idempotent: bestaande uitvoerbestanden worden overgeslagen.
# Nooit opschalen: is het origineel smaller dan de doelbreedte, dan wordt het
# op ware grootte weggeschreven.
set -uo pipefail

DEFAULT_SRC="/private/tmp/claude-501/-Users-Dimitri-Developer-Projects--brtmldr/23ecb021-6c2d-4fcd-990c-ed99f0c9e79e/scratchpad/raw"
SRC_DIR="${1:-$DEFAULT_SRC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$PROJECT_DIR/assets/img"

CWEBP="${CWEBP:-$(command -v cwebp || echo /Users/Dimitri/anaconda3/bin/cwebp)}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
JOBS="${JOBS:-6}"
QUALITY="${QUALITY:-78}"
WIDTHS="${WIDTHS:-2000 1600 1200 800}"

if [ ! -d "$SRC_DIR" ]; then
  echo "Invoermap bestaat niet: $SRC_DIR" >&2
  exit 1
fi
if [ ! -x "$CWEBP" ]; then
  echo "cwebp niet gevonden op: $CWEBP" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/images-sh.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

convert_one() {
  src="$1"
  base="$(basename "$src")"
  name="${base%.*}"
  # Alleen letters, cijfers, punt, streepje en laag streepje in de uitvoernaam; spaties, plustekens en
  # andere tekens worden een streepje. Zo blijft de URL schoon. Dezelfde regel staat in scripts/new-project.sh.
  name="$(printf '%s' "$name" | sed -E 's/[^A-Za-z0-9._-]+/-/g; s/-+/-/g; s/^-|-$//g')"
  fallback_src=""

  # Welke breedtes ontbreken nog? Zo niet, dan is er niets te doen.
  todo=""
  for w in $WIDTHS; do
    [ -s "$OUT_DIR/${name}-${w}.webp" ] || todo="$todo $w"
  done
  [ -z "$todo" ] && return 0

  # Breedte van het origineel, zodat we nooit opschalen.
  src_w="$("$PYTHON_BIN" - "$src" <<'PY' 2>/dev/null
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
print(Image.open(sys.argv[1]).size[0])
PY
)"
  case "$src_w" in ''|*[!0-9]*) src_w=0 ;; esac

  for w in $todo; do
    dst="$OUT_DIR/${name}-${w}.webp"

    # Kleiner origineel dan de doelbreedte: op ware grootte wegschrijven.
    if [ "$src_w" -gt 0 ] && [ "$src_w" -le "$w" ]; then
      resize_args=()
    else
      resize_args=(-resize "$w" 0)
    fi

    if "$CWEBP" -q "$QUALITY" -m 6 -sharp_yuv "${resize_args[@]}" -metadata none "$src" -o "$dst" >/dev/null 2>&1 && [ -s "$dst" ]; then
      continue
    fi

    rm -f "$dst"
    # Omweg via Pillow: eerst naar RGB-JPEG in een tijdelijke map.
    if [ -z "$fallback_src" ]; then
      fallback_src="$TMP_DIR/${name}.jpg"
      if ! "$PYTHON_BIN" - "$src" "$fallback_src" <<'PY' >/dev/null 2>&1
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
if im.mode in ("RGBA", "LA", "P"):
    im = im.convert("RGBA")
    bg = Image.new("RGB", im.size, (255, 255, 255))
    bg.paste(im, mask=im.split()[-1])
    im = bg
else:
    im = im.convert("RGB")
im.save(dst, "JPEG", quality=95, subsampling=0)
PY
      then
        echo "FOUT (Pillow-omweg mislukt): $base" >&2
        fallback_src="__failed__"
      fi
    fi

    if [ "$fallback_src" = "__failed__" ]; then
      echo "FOUT (geen uitvoer): $base -> ${name}-${w}.webp" >&2
      continue
    fi

    echo "PILLOW-OMWEG: $base" >&2
    if ! "$CWEBP" -q "$QUALITY" -m 6 -sharp_yuv "${resize_args[@]}" -metadata none "$fallback_src" -o "$dst" >/dev/null 2>&1 || [ ! -s "$dst" ]; then
      rm -f "$dst"
      echo "FOUT (cwebp mislukt na omweg): $base -> ${name}-${w}.webp" >&2
    fi
  done
}
export -f convert_one
export OUT_DIR TMP_DIR CWEBP PYTHON_BIN QUALITY WIDTHS

find "$SRC_DIR" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 \
  | xargs -0 -P "$JOBS" -I{} bash -c 'convert_one "$@"' _ {}

# Index bijwerken: per foto de echte pixelmaten per breedte. build.mjs rekent hiermee.
"$PYTHON_BIN" - "$OUT_DIR" <<'PY'
import json, os, re, sys
from PIL import Image
out = sys.argv[1]
index = {}
for f in sorted(os.listdir(out)):
    m = re.match(r'^(.*)-(\d+)\.webp$', f)
    if not m: continue
    name, w = m.group(1), m.group(2)
    try:
        size = Image.open(os.path.join(out, f)).size
    except Exception:
        continue
    e = index.setdefault(name, {"widths": [], "sizes": {}})
    e["widths"].append(int(w)); e["sizes"][w] = list(size)
for name, e in index.items():
    e["widths"].sort()
    ref = e["sizes"].get("1600") or e["sizes"][str(max(e["widths"]))]
    e["w"], e["h"] = ref
    index[name] = {"w": e["w"], "h": e["h"], "widths": e["widths"], "sizes": e["sizes"]}
json.dump(index, open(os.path.join(out, "index.json"), "w"), indent=1, sort_keys=True)
print(f"index.json bijgewerkt: {len(index)} foto's")
PY

echo "Klaar. WebP-bestanden in $OUT_DIR: $(find "$OUT_DIR" -maxdepth 1 -name '*.webp' | wc -l | tr -d ' ')"
