#!/usr/bin/env python3
"""Maakt per project een JPEG van 1200 px breed voor linkpreviews (og:image) uit de coverfoto.
Gebruik: python3 scripts/og.py   (vereist Pillow met WebP-ondersteuning)"""
import json, glob, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(f"{ROOT}/assets/og", exist_ok=True)
site = json.load(open(f"{ROOT}/content/site.json"))
jobs = [(p['slug'], p['cover']) for p in (json.load(open(f)) for f in glob.glob(f"{ROOT}/content/projects/*.json"))]
jobs.append(('about', site['about']['portrait']['file']))
for slug, cover in jobs:
    src = f"{ROOT}/assets/img/{cover.replace('+','-')}-1600.webp"
    dst = f"{ROOT}/assets/og/{slug}.jpg"
    if os.path.exists(dst): continue
    im = Image.open(src).convert('RGB')
    im.thumbnail((1200, 1200))
    im.save(dst, 'JPEG', quality=82, optimize=True, progressive=True)
    print('og', slug, im.size)
