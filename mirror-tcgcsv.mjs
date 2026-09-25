// Daily mirror of TCGCSV (tcgcsv.com, a free daily copy of TCGplayer prices) for
// the PokéDex web app: TCGCSV doesn't allow requests from browsers, so the app
// reads these copies from its own site. Only what the app uses is kept, and only
// for sets from the last two years (older sets have prices in pokemontcg.io).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'https://tcgcsv.com/tcgplayer/3'; // 3 = Pokémon
const OUT = process.argv[2] ?? 'site/tcgcsv';
const HEADERS = { 'User-Agent': 'PokedexScanner/1.0.0 (personal collection app; daily mirror)' };
const SINCE = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;

async function get(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) return res.json();
    if (attempt >= 3) throw new Error(`${url}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

function save(path, data) {
  mkdirSync(join(OUT, ...path.slice(0, -1)), { recursive: true });
  writeFileSync(join(OUT, ...path), JSON.stringify(data));
}

const groups = (await get(`${SRC}/groups`)).results;
save(['groups'], {
  results: groups.map((g) => ({ groupId: g.groupId, name: g.name, abbreviation: g.abbreviation })),
});

const recent = groups.filter((g) => Date.parse(g.publishedOn) >= SINCE);
for (const g of recent) {
  const products = (await get(`${SRC}/${g.groupId}/products`)).results;
  const prices = (await get(`${SRC}/${g.groupId}/prices`)).results;
  save([String(g.groupId), 'products'], {
    results: products.map((p) => ({
      productId: p.productId,
      name: p.name,
      url: p.url,
      extendedData: (p.extendedData ?? []).filter((e) => e.name === 'Number'),
    })),
  });
  save([String(g.groupId), 'prices'], { results: prices });
  await new Promise((r) => setTimeout(r, 250)); // be gentle with a free service
}
console.log(`TCGCSV: ${groups.length} setów na liście, ceny dla ${recent.length} najnowszych.`);
