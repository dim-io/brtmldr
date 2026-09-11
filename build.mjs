#!/usr/bin/env node
// Statische generator voor brtmldr.com. Geen dependencies: node build.mjs
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const warnings = [];
const warn = m => warnings.push(m);

// JSON lezen met een leesbare foutmelding (bestand en regel) voor als er een komma te veel staat.
function readJson(rel) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  try { return JSON.parse(text); }
  catch (e) {
    const pos = Number((e.message.match(/position (\d+)/) || [])[1]);
    const line = Number.isFinite(pos) ? text.slice(0, pos).split('\n').length : '?';
    console.error(`\nFout in ${rel}, regel ${line}: het bestand is geen geldige JSON (${e.message}).\nKijk naar een ontbrekende of overbodige komma, aanhalingsteken of accolade rond die regel.\n`);
    process.exit(1);
  }
}

const site = readJson('content/site.json');
const projects = {};
for (const f of readdirSync(join(ROOT, 'content/projects')).filter(f => f.endsWith('.json'))) {
  const p = readJson(`content/projects/${f}`);
  if (!p.slug || !p.title) { warn(`content/projects/${f}: slug of title ontbreekt, project overgeslagen.`); continue; }
  if (p.slug !== f.replace(/\.json$/, '')) warn(`content/projects/${f}: slug "${p.slug}" is anders dan de bestandsnaam.`);
  projects[p.slug] = p;
}
const imgIndex = existsSync(join(ROOT, 'assets/img/index.json')) ? readJson('assets/img/index.json') : {};
if (!Object.keys(imgIndex).length) warn('assets/img/index.json ontbreekt of is leeg. Draai eerst scripts/images.sh.');

// Layoutconstanten voor de uitgelijnde rijen (zie src/style.css .rows)
const MAX_WIDTH = 1180;   // maximale contentbreedte in px, gelijk aan --max in style.css
const ROW_HEIGHT = 540;   // gewenste rijhoogte in px op die breedte
const STACK_BREAKPOINT = 1000; // onder deze breedte staan projectfoto's onder elkaar (zie style.css)

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const lower = s => String(s).toLowerCase();
const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 8);

// Een foto in de content mag een string zijn (bestandsnaam) of { file, alt }. Afmetingen komen uit index.json.
function resolveImage(entry, where) {
  const img = typeof entry === 'string' ? { file: entry } : { ...entry };
  img.file = String(img.file || '').replace(/\+/g, '-').replace(/-(800|1200|1600|2000)\.webp$/, '').replace(/\.(jpe?g|png|webp)$/i, '');
  const idx = imgIndex[img.file];
  if (!idx) { warn(`${where}: foto "${img.file}" staat niet in assets/img (nog niet omgezet?). Overgeslagen.`); return null; }
  img.w = idx.w; img.h = idx.h; img.widths = idx.widths || [800, 1600];
  img.alt = img.alt || '';
  return img;
}
for (const p of Object.values(projects)) {
  p.images = (p.images || []).map(e => resolveImage(e, `${p.slug}.json`)).filter(Boolean);
  if (!p.images.length) warn(`${p.slug}.json: geen enkele bruikbare foto.`);
  p.cover = String(p.cover || '').replace(/\+/g, '-');
  p.coverImg = p.images.find(im => im.file === p.cover);
  if (!p.coverImg && p.images.length) { warn(`${p.slug}.json: cover "${p.cover}" niet gevonden in de fotolijst, eerste foto gebruikt.`); p.coverImg = p.images[0]; }
}
site.about.portrait = resolveImage(site.about.portrait, 'site.json (portrait)') || { file: '', w: 1, h: 1, widths: [], alt: '' };

const order = (site.homeOrder || []).filter(s => { if (!projects[s]) warn(`site.json homeOrder: "${s}" bestaat niet als project.`); return projects[s]; });
for (const s of Object.keys(projects)) if (!order.includes(s)) warn(`${s}.json staat niet in homeOrder in site.json en is dus niet te vinden via menu, homepage of sitemap.`);

const srcUrl = (img, w) => `/assets/img/${img.file}-${w}.webp`;
const largest = img => Math.max(...img.widths);
const viewerWidth = img => img.widths.includes(2000) ? 2000 : largest(img);
const displayWidths = img => img.widths.filter(w => w <= 1600);

let missingAlt = 0;
function picture(img, { sizes, eager = false, fallbackAlt = '' }) {
  if (!img.alt) missingAlt++;
  const ws = displayWidths(img);
  const srcset = ws.map(w => `${srcUrl(img, w)} ${w}w`).join(', ');
  return `<img src="${srcUrl(img, Math.max(...ws))}" srcset="${srcset}" sizes="${sizes}" width="${img.w}" height="${img.h}" alt="${esc(img.alt || fallbackAlt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
// sizes: boven de maximale breedte staat de container vast; onder STACK_BREAKPOINT vult een foto de hele breedte.
const sizesFor = pct => `(min-width: ${MAX_WIDTH + 160}px) ${Math.round(MAX_WIDTH * pct / 100)}px, (max-width: ${STACK_BREAKPOINT}px) 100vw, ${Math.ceil(pct)}vw`;

// Rijen: dynamisch programmeren kiest de verdeling met de kleinste afwijking van de doelverhouding.
function buildRows(images, title) {
  const target = MAX_WIDTH / ROW_HEIGHT;
  const items = images.map((img, i) => ({ img, ar: img.w / img.h, n: i + 1 }));
  const n = items.length, INF = 1e18;
  const best = Array(n + 1).fill(INF), cut = Array(n + 1).fill(0);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    let sum = 0;
    for (let i = j - 1; i >= 0 && j - i <= 6; i--) {
      sum += items[i].ar;
      const isLast = j === n;
      const dev = isLast ? Math.max(0, sum - target) : sum - target;
      const cost = best[i] + dev * dev * (dev < 0 ? 5 : 1); // te hoge rijen wegen zwaarder
      if (cost < best[j]) { best[j] = cost; cut[j] = i; }
    }
  }
  const rows = [];
  for (let j = n; j > 0; j = cut[j]) rows.unshift(items.slice(cut[j], j));
  const arSum = r => r.reduce((a, it) => a + it.ar, 0);
  while (rows.length > 1) { // te lege slotrij aanvullen uit de rij ervoor
    const last = rows[rows.length - 1], prev = rows[rows.length - 2];
    if (arSum(last) >= target * 0.6 || prev.length < 3) break;
    last.unshift(prev.pop());
  }
  // Mobiel: twee opeenvolgende staande foto's naast elkaar.
  for (let i = 0; i < items.length - 1; i++) {
    if (items[i].pair || items[i].ar >= 1 || items[i + 1].ar >= 1) continue;
    items[i].pair = items[i + 1].pair = true; i++;
  }
  const total = items.length;
  return rows.map((r, ri) => {
    const isLast = ri === rows.length - 1, sumAr = arSum(r);
    const floor = isLast ? target : target * 0.8;  // nooit hoger dan het doel (slotrij) of 25% erboven
    const rowAr = Math.max(sumAr, floor), centred = rowAr > sumAr + 0.001;
    const inner = r.map((it, i) => {
      const pct = (it.ar / rowAr) * 100;
      const fallbackAlt = `Analogue photograph ${it.n} of ${total} from the ${title} series by ${site.name}`;
      return `<figure class="cell${it.pair ? ' pair' : ''}" style="--ar:${it.ar.toFixed(4)}"><a class="zoom" href="${srcUrl(it.img, viewerWidth(it.img))}" data-index="${it.n - 1}" aria-label="Open photo ${it.n} of ${total}">${picture(it.img, { sizes: sizesFor(pct), eager: ri === 0 && i < 2, fallbackAlt })}</a></figure>`;
    }).join('');
    return `<div class="row${centred ? ' row--centred' : ''}" style="--row-ar:${rowAr.toFixed(4)};--n:${r.length}">${inner}</div>`;
  }).join('\n');
}

const icons = {
  mail: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 5h18v14H3z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m3 6 9 7 9-7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  ig: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor"/></svg>`,
};

// Stijl en script met inhoudshash in de naam, zodat browsers nooit een oude versie uit de cache pakken.
const css = readFileSync(join(ROOT, 'assets/fonts/fonts.css'), 'utf8') + '\n' + readFileSync(join(ROOT, 'src/style.css'), 'utf8');
const js = readFileSync(join(ROOT, 'src/main.js'), 'utf8');
const cssName = `style.${hash(css)}.css`, jsName = `main.${hash(js)}.js`;
const year = new Date().getFullYear();

function caption(p, tag = 'p') {
  const label = p.year ? ` <span class="sep">|</span> <span class="type">${esc(p.year)}</span>` : '';
  return `<${tag} class="caption"><strong>${esc(lower(p.title))}</strong>${label}</${tag}>`;
}

function layout({ title, description, path, body, ogSlug, ogAlt = '', bodyClass = '', jsonLd = '', noindex = false }) {
  const url = site.url + path;
  const hasOg = ogSlug && existsSync(join(ROOT, 'assets/og', `${ogSlug}.jpg`));
  const og = hasOg ? `${site.url}/assets/og/${ogSlug}.jpg` : `${site.url}/assets/logo.png`;
  const onProject = order.some(s => path === `/${s}/`);
  const sub = order.map(s => `<li><a href="/${s}/"${path === `/${s}/` ? ' aria-current="page"' : ''}>${esc(lower(projects[s].title))}</a></li>`).join('');
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.title)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">${ogAlt ? `\n<meta property="og:image:alt" content="${esc(ogAlt)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/favicon.png">
<link rel="preload" href="/assets/fonts/Manrope-variable-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/NunitoSans-variable-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/${cssName}">
<script>document.documentElement.classList.remove('no-js')</script>
${jsonLd}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <a class="brand" href="/" aria-label="${esc(site.title)} home"><img src="/assets/logo.png" alt="${esc(site.title)}" width="640" height="204"></a>
  <button class="menu-toggle" aria-expanded="false" aria-controls="nav" aria-label="Menu"><span></span><span></span></button>
  <nav id="nav" class="site-nav">
    <div class="nav-item has-menu"><a href="/"${path === '/' || onProject ? ' aria-current="page"' : ''}>projects</a><ul class="submenu">${sub}</ul></div>
    <a href="/about/"${path.startsWith('/about') ? ' aria-current="page"' : ''}>about</a>
    <a href="mailto:${site.email}" class="icon" aria-label="E-mail ${esc(site.name)}">${icons.mail}</a>
    <a href="${site.instagram}" class="icon" target="_blank" rel="noopener" aria-label="Instagram ${esc(site.instagramHandle)}">${icons.ig}</a>
  </nav>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <p>${esc(site.footer)} ${year}.</p>
  <div class="footer-links">
    <a href="mailto:${site.email}" class="icon" aria-label="E-mail ${esc(site.name)}">${icons.mail}</a>
    <a href="${site.instagram}" class="icon" target="_blank" rel="noopener" aria-label="Instagram ${esc(site.instagramHandle)}">${icons.ig}</a>
  </div>
</footer>
<script src="/assets/${jsName}" defer></script>
</body>
</html>
`;
}

function homePage() {
  const tiles = order.map((slug, i) => {
    const p = projects[slug];
    if (!p.coverImg) return '';
    const w = Math.min(1, Math.max(0.6, Number(p.weight) || 1));
    const pct = 50 * w; // twee kolommen
    return `<a class="tile" href="/${slug}/" style="--i:${i};--w:${w}">
  ${picture(p.coverImg, { sizes: `(min-width: ${MAX_WIDTH + 160}px) ${Math.round(MAX_WIDTH * pct / 100)}px, (max-width: 700px) 100vw, ${Math.round(pct)}vw`, eager: i < 2, fallbackAlt: `${p.title}, analogue photograph by ${site.name}` })}
  ${caption(p)}
</a>`;
  }).join('\n');
  const first = projects[order[0]];
  return layout({
    title: site.seoTitle, description: site.description, path: '/', bodyClass: 'home',
    ogSlug: order[0], ogAlt: `${first.title}, analogue photograph by ${site.name}`,
    body: `<h1 class="tagline-line">${esc(site.tagline)}</h1>\n<section class="tiles" aria-label="Projects">\n${tiles}\n</section>`,
    jsonLd: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Person', name: site.name, alternateName: site.title, url: site.url, email: site.email, jobTitle: 'Photographer', address: { '@type': 'PostalAddress', addressLocality: 'Haarlem', addressCountry: 'NL' }, sameAs: [site.instagram] })}</script>`,
  });
}

function projectPage(p) {
  const i = order.indexOf(p.slug);
  const next = projects[order[(i + 1) % order.length]], prev = projects[order[(i - 1 + order.length) % order.length]];
  const link = (q, label, rel) => `<a href="/${q.slug}/" rel="${rel}" class="pager-${rel}"><span class="label">${label}</span> <strong>${esc(lower(q.title))}</strong></a>`;
  const jsonLd = { '@context': 'https://schema.org', '@type': 'ImageGallery', name: `${p.title}${p.year ? `, ${p.year}` : ''}`, url: `${site.url}/${p.slug}/`, description: p.description, about: p.title,
    creator: { '@type': 'Person', name: site.name, url: site.url }, copyrightHolder: { '@type': 'Person', name: site.name }, acquireLicensePage: `${site.url}/about/`,
    image: p.images.slice(0, 20).map(im => ({ '@type': 'ImageObject', contentUrl: `${site.url}${srcUrl(im, 1600)}`, width: im.w, height: im.h, creator: { '@type': 'Person', name: site.name }, copyrightNotice: `© ${site.name}`, creditText: site.name })) };
  return layout({
    title: `${p.title}${p.year ? ` ${p.year}` : ''}, analogue photography by ${site.name}`, description: p.description, path: `/${p.slug}/`, bodyClass: 'project', ogSlug: p.slug,
    ogAlt: (p.images[0] && p.images[0].alt) || `${p.title}, analogue photograph by ${site.name}`,
    jsonLd: `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    body: `<header class="project-head">${caption(p, 'h1')}${p.meta ? `<p class="meta">${esc(p.meta)}</p>` : ''}${p.intro ? `<p class="intro">${esc(p.intro)}</p>` : ''}</header>
<section class="rows" aria-label="${esc(p.title)} photographs">
${buildRows(p.images, p.title)}
</section>
<nav class="pager" aria-label="Other projects">${link(prev, 'previous', 'prev')}${link(next, 'next', 'next')}</nav>`,
  });
}

function aboutPage() {
  const a = site.about;
  const item = x => typeof x === 'string' ? esc(x) : (x.url ? `<a href="${x.url}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name));
  const list = (title, items) => `<div class="group"><h2>${title}</h2><ul>${items.map(x => `<li>${item(x)}</li>`).join('')}</ul></div>`;
  return layout({
    title: a.seoTitle, description: a.description, path: '/about/', bodyClass: 'about', ogSlug: 'about', ogAlt: a.portrait.alt,
    body: `<h1 class="visually-hidden">Contact &amp; about ${esc(site.name)}</h1>
<section class="about-grid">
  <div class="about-text">
    ${a.bio.map(par => `<p class="bio">${esc(par)}</p>`).join('\n    ')}
    <div class="lists">
      ${list('publications &amp; books', a.publications)}
      ${list('collaborations', a.collaborations)}
      ${list('image licensing', a.licensingClients)}
    </div>
    <div class="contact">
      <div class="group"><h2>e-mail</h2><p><a href="mailto:${site.email}">${site.email}</a></p></div>
      <div class="group"><h2>licensing</h2><p><a href="mailto:${a.licensing.email}">${a.licensing.email}</a><br><a href="${a.licensing.url}" target="_blank" rel="noopener">${esc(a.licensing.label)}</a></p></div>
      <div class="group"><h2>instagram</h2><p><a href="${site.instagram}" target="_blank" rel="noopener">${esc(site.instagramHandle)}</a></p></div>
    </div>
  </div>
  <figure class="portrait">${a.portrait.file ? picture(a.portrait, { sizes: '(max-width: 700px) 92vw, 34vw', eager: true }) : ''}</figure>
</section>`,
  });
}

const notFound = () => layout({ title: `Page not found | ${site.name}`, description: site.description, path: '/404.html', bodyClass: 'notfound', noindex: true,
  body: `<section class="empty"><p class="caption"><strong>404</strong> <span class="sep">|</span> <span class="type">page not found</span></p><p><a href="/">back to the projects</a></p></section>` });
const redirect = to => `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${to}"><link rel="canonical" href="${site.url}${to}"><meta name="robots" content="noindex"><title>Redirecting</title><a href="${to}">${to}</a>`;

// Schrijven. dist/ wordt geleegd maar niet verwijderd, zodat een draaiende testserver blijft werken.
mkdirSync(DIST, { recursive: true });
for (const entry of readdirSync(DIST)) rmSync(join(DIST, entry), { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });
// Op een tijdelijk adres zonder eigen domein (bijvoorbeeld dim-io.github.io/brtmldr/) staat de site in een submap.
// Zet dan SITE_BASE=/brtmldr: alle interne links krijgen dat voorvoegsel en de site vraagt zoekmachines hem niet te indexeren.
const BASE = (process.env.SITE_BASE || '').replace(/\/+$/, '');
const withBase = html => !BASE ? html : html
  .replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`)
  .replace(/(srcset="|,\s)\/assets\//g, `$1${BASE}/assets/`)
  .replace(/url=\//g, `url=${BASE}/`)
  .replace(/<link rel="canonical"[^>]*>/g, '<meta name="robots" content="noindex">');
const write = (rel, content) => { const f = join(DIST, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, rel.endsWith('.html') ? withBase(content) : content); };

write('index.html', homePage());
write('about/index.html', aboutPage());
for (const p of Object.values(projects)) {
  write(`${p.slug}/index.html`, projectPage(p));
  for (const alias of p.aliases || []) write(`${alias.replace(/^\/|\/$/g, '')}/index.html`, redirect(`/${p.slug}/`));
}
for (const [from, to] of Object.entries(site.redirects || {})) write(`${from.replace(/^\/|\/$/g, '')}/index.html`, redirect(to));
write('404.html', notFound());
write(`assets/${cssName}`, css);
write(`assets/${jsName}`, js);
cpSync(join(ROOT, 'assets/img'), join(DIST, 'assets/img'), { recursive: true, filter: s => !s.endsWith('index.json') });
cpSync(join(ROOT, 'assets/fonts'), join(DIST, 'assets/fonts'), { recursive: true, filter: s => !s.endsWith('.css') });
if (existsSync(join(ROOT, 'assets/og'))) cpSync(join(ROOT, 'assets/og'), join(DIST, 'assets/og'), { recursive: true });
cpSync(join(ROOT, 'assets/logo.png'), join(DIST, 'assets/logo.png'));
cpSync(join(ROOT, 'assets/favicon.png'), join(DIST, 'assets/favicon.png'));

const pages = ['/', '/about/', ...order.map(s => `/${s}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(u => `  <url><loc>${site.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
if (!BASE) write('CNAME', site.domain + '\n');
write('.nojekyll', '');

if (missingAlt) warn(`${missingAlt} foto's hebben geen eigen alt-tekst; de site gebruikt een automatische beschrijving. Vul "alt" aan in content/projects/*.json als je wilt.`);
for (const w of warnings) console.warn('Let op: ' + w);
console.log(`Gebouwd${BASE ? ` (tijdelijk adres, basis ${BASE})` : ''}: ${pages.length} pagina's, ${Object.values(projects).reduce((n, p) => n + p.images.length, 0)} foto's in projecten -> dist/`);
