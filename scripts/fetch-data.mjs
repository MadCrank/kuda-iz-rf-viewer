#!/usr/bin/env node

import { spawn } from 'child_process';
import { gunzipSync } from 'zlib';
import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://xn--80ahkdh8c.xn--p1ai';
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
const PAGES_DIR = join(OUTPUT_DIR, 'pages');

// The source site now renders tickets client-side and ships them as gzipped JSON:
//   json/group_RU_{slug}_empty_{days}_{stops}.json.gz
// City/country codes are resolved to Russian names via the helper dictionaries below.
const PAGES = [
  { id: 'featured-120-2', file: 'group_RU_samye-deshevye-aviabilety_po-miru_empty_120_2.json.gz', name: 'Избранные 120 дней, с пересадками' },
  { id: 'featured-30-2', file: 'group_RU_samye-deshevye-aviabilety_po-miru_empty_30_2.json.gz', name: 'Избранные 30 дней, с пересадками' },
  { id: 'featured-365-2', file: 'group_RU_samye-deshevye-aviabilety_po-miru_empty_365_2.json.gz', name: 'Избранные 365 дней, с пересадками' },
  { id: 'cheap-120-0', file: 'group_RU_deshevye-aviabilety_po-miru_empty_120_0.json.gz', name: 'Дешёвые 120 дней, без пересадок' },
  { id: 'cheap-120-2', file: 'group_RU_deshevye-aviabilety_po-miru_empty_120_2.json.gz', name: 'Дешёвые 120 дней, с пересадками' },
  { id: 'cheap-30-0', file: 'group_RU_deshevye-aviabilety_po-miru_empty_30_0.json.gz', name: 'Дешёвые 30 дней, без пересадок' },
  { id: 'cheap-30-2', file: 'group_RU_deshevye-aviabilety_po-miru_empty_30_2.json.gz', name: 'Дешёвые 30 дней, с пересадками' },
  { id: 'cheap-365-0', file: 'group_RU_deshevye-aviabilety_po-miru_empty_365_0.json.gz', name: 'Дешёвые 365 дней, без пересадок' },
  { id: 'cheap-365-2', file: 'group_RU_deshevye-aviabilety_po-miru_empty_365_2.json.gz', name: 'Дешёвые 365 дней, с пересадками' },
];

const CURRENCY_SYMBOLS = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  KZT: '₸',
  THB: '฿',
  AZN: '₼',
  INR: '₹',
  AMD: '֏',
  BYN: 'Br',
  UZS: "so'm",
  GEL: '₾',
};

// Deterministic id derived from stable ticket identity (NOT the link, whose
// query params change on every source regeneration). This keeps git deltas
// small between scheduled runs.
function ticketId(t) {
  return createHash('md5')
    .update(`${t.pageId}|${t.fromCity}|${t.toCity}|${t.date}|${t.stops}|${t.price}|${t.currency}`)
    .digest('hex')
    .slice(0, 12);
}

// '2026-12-06' -> '06.12.26' (matches the frontend's ДД.ММ.ГГ placeholder)
function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1].slice(2)}` : (iso || '');
}

// '2026-08-30T13:32:09+00:00' -> '2026-08-30 13:32:09'
function formatUpdatedAt(iso) {
  return (iso || '').replace('T', ' ').slice(0, 19);
}

function transformGroup(data, pageId, cityNames, countryNames) {
  const out = {
    updatedAt: formatUpdatedAt(data.meta && data.meta.generated_at),
    cities: [],
    pageId,
  };

  for (const [fromCode, byCountry] of Object.entries(data.data || {})) {
    const fromCity = cityNames[fromCode] || fromCode;
    const routes = [];

    for (const [countryCode, routeList] of Object.entries(byCountry || {})) {
      const country = countryNames[countryCode] || countryCode;

      for (const route of routeList || []) {
        const parts = (route.route || '').split(/\s*-\s*/);
        const toCode = parts[1] || '';
        const toCity = cityNames[toCode] || toCode;

        const tickets = (route.one_way || [])
          .map(([date, stops, price, currency, link]) => ({
            pageId,
            fromCity,
            toCity,
            date,
            stops: Number(stops) || 0,
            price: Number(price) || 0,
            currency: currency || 'RUB',
            link,
          }))
          .filter((t) => t.price > 0)
          .map((t) => ({
            id: ticketId(t),
            fromCity: t.fromCity,
            toCity: t.toCity,
            country,
            date: formatDate(t.date),
            stops: t.stops,
            price: t.price,
            currency: CURRENCY_SYMBOLS[t.currency] || t.currency,
            link: t.link.startsWith('http') ? t.link : `${BASE_URL}${t.link}`,
          }));

        if (tickets.length > 0) {
          tickets.sort((a, b) => (a.date === b.date ? a.price - b.price : a.date.localeCompare(b.date)));
          routes.push({ fromCity, toCity, country, tickets });
        }
      }
    }

    if (routes.length > 0) {
      routes.sort((a, b) => a.toCity.localeCompare(b.toCity, 'ru'));
      out.cities.push({ city: fromCity, routes });
    }
  }

  out.cities.sort((a, b) => a.city.localeCompare(b.city, 'ru'));
  return out;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-sL',
      '--compressed',
      '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      url,
    ]);

    const chunks = [];
    let stderr = '';

    curl.stdout.on('data', (chunk) => chunks.push(chunk));
    curl.stderr.on('data', (data) => (stderr += data.toString()));

    curl.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`curl exited with code ${code}: ${stderr}`));
      }
    });

    curl.on('error', reject);
  });
}

// Fetches and decompresses a .json.gz file into a JS object.
async function fetchGzJson(path) {
  const buf = await fetchUrl(`${BASE_URL}/${path}`);
  return JSON.parse(gunzipSync(buf).toString('utf8'));
}

async function main() {
  console.log('Fetching ticket data...\n');

  // Clean and recreate output directories
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(PAGES_DIR, { recursive: true });

  let cityNames;
  let countryNames;
  try {
    [cityNames, countryNames] = await Promise.all([
      fetchGzJson('cities-ru.json.gz'),
      fetchGzJson('countries-ru.json.gz'),
    ]);
  } catch (error) {
    console.error(`  ✗ Failed to load dictionaries: ${error.message}`);
    process.exit(1);
  }

  const indexData = {
    fetchedAt: new Date().toISOString(),
    pages: {},
  };

  let totalCities = 0;

  for (const page of PAGES) {
    console.log(`Fetching ${page.name}...`);
    const pageFile = join(PAGES_DIR, `${page.id}.json`);

    try {
      const raw = await fetchGzJson(`json/${page.file}`);
      const data = transformGroup(raw, page.id, cityNames, countryNames);

      writeFileSync(pageFile, JSON.stringify(data));

      indexData.pages[page.id] = {
        updatedAt: data.updatedAt,
        cities: data.cities.length,
        cityList: data.cities.map((c) => c.city),
      };

      totalCities += data.cities.length;
      console.log(`  ✓ Got ${data.cities.length} cities`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);

      const errorData = { error: error.message, cities: [], pageId: page.id, updatedAt: '' };
      writeFileSync(pageFile, JSON.stringify(errorData));

      indexData.pages[page.id] = {
        error: error.message,
        cities: 0,
        cityList: [],
      };
    }
  }

  writeFileSync(join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexData));

  console.log('\n✅ Data saved to public/data/');
  console.log('   Index: public/data/index.json');
  console.log('   Pages: public/data/pages/*.json');
  console.log(`   Total cities: ${totalCities}`);
}

main().catch(console.error);
