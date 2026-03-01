#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://xn--80ahkdh8c.xn--p1ai';
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');
const PAGES_DIR = join(OUTPUT_DIR, 'pages');

const PAGES = [
  { id: 'featured-120-2', url: 'samye-deshevye-aviabilety-po-miru-120-2.html', name: 'Избранные 120 дней, с пересадками' },
  { id: 'featured-30-2', url: 'samye-deshevye-aviabilety-po-miru-30-2.html', name: 'Избранные 30 дней, с пересадками' },
  { id: 'featured-365-2', url: 'samye-deshevye-aviabilety-po-miru-365-2.html', name: 'Избранные 365 дней, с пересадками' },
  { id: 'cheap-120-0', url: 'deshevye-aviabilety-po-miru-120-0.html', name: 'Дешёвые 120 дней, без пересадок' },
  { id: 'cheap-120-2', url: 'deshevye-aviabilety-po-miru-120-2.html', name: 'Дешёвые 120 дней, с пересадками' },
  { id: 'cheap-30-0', url: 'deshevye-aviabilety-po-miru-30-0.html', name: 'Дешёвые 30 дней, без пересадок' },
  { id: 'cheap-30-2', url: 'deshevye-aviabilety-po-miru-30-2.html', name: 'Дешёвые 30 дней, с пересадками' },
  { id: 'cheap-365-0', url: 'deshevye-aviabilety-po-miru-365-0.html', name: 'Дешёвые 365 дней, без пересадок' },
  { id: 'cheap-365-2', url: 'deshevye-aviabilety-po-miru-365-2.html', name: 'Дешёвые 365 дней, с пересадками' },
];

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function parsePrice(text) {
  const match = text.match(/(\d+)\s*(₽|\$|€)/);
  if (match) {
    return { price: parseInt(match[1], 10), currency: match[2] };
  }
  return { price: 0, currency: '₽' };
}

function parseTicketsHtml(html, pageId) {
  const updatedAtMatch = html.match(/Обновлено<\/b>:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  const updatedAt = updatedAtMatch ? updatedAtMatch[1] : '';

  const cities = [];

  // Match details elements containing city data
  const detailsRegex = /<details[^>]*>([\s\S]*?)<\/details>/gi;
  let detailsMatch;

  while ((detailsMatch = detailsRegex.exec(html)) !== null) {
    const detailsContent = detailsMatch[1];

    // Extract city name from summary h3
    const summaryMatch = detailsContent.match(/<summary[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>/i);
    if (!summaryMatch) continue;

    const cityName = summaryMatch[1].trim();
    if (!cityName) continue;

    const routes = [];
    let currentCountry = '';

    // Split by H3 tags for countries (note: uppercase H3 in source)
    const parts = detailsContent.split(/<H3>([^<]+)<\/H3>/i);

    for (let i = 1; i < parts.length; i += 2) {
      currentCountry = parts[i].trim();
      const routeContent = parts[i + 1] || '';

      // Split by bold tags for routes
      const routeParts = routeContent.split(/<b>([^<]+)<\/b>/);

      for (let j = 1; j < routeParts.length; j += 2) {
        const routeName = routeParts[j].trim();
        const ticketContent = routeParts[j + 1] || '';

        // Skip non-route elements
        if (!routeName.includes('-')) continue;

        const [fromCity, toCity] = routeName.split('-').map(s => s.trim());
        if (!fromCity || !toCity) continue;

        const tickets = [];

        // Parse individual tickets
        // Format: →[0]:19.04.26  <a href="...">7465 ₽</a> <a href="...">🏠</a>
        const ticketRegex = /→\[(\d+)\]:(\d{2}\.\d{2}\.\d{2})\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>(?:\s*<a[^>]*href="([^"]+)"[^>]*>🏠<\/a>)?/g;

        let ticketMatch;
        while ((ticketMatch = ticketRegex.exec(ticketContent)) !== null) {
          const [, stops, date, link, priceText, hotelLink] = ticketMatch;
          const { price, currency } = parsePrice(priceText);

          if (price > 0) {
            tickets.push({
              id: generateId(),
              fromCity,
              toCity,
              country: currentCountry,
              date,
              stops: parseInt(stops, 10),
              price,
              currency,
              link,
              hotelLink: hotelLink || undefined,
            });
          }
        }

        if (tickets.length > 0) {
          routes.push({
            fromCity,
            toCity,
            country: currentCountry,
            tickets,
          });
        }
      }
    }

    if (routes.length > 0) {
      cities.push({
        city: cityName,
        routes,
      });
    }
  }

  return { updatedAt, cities, pageId };
}

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', [
      '-sL',
      '--compressed',
      '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      `${BASE_URL}/${url}`
    ]);

    let stdout = '';
    let stderr = '';

    curl.stdout.on('data', (data) => stdout += data.toString());
    curl.stderr.on('data', (data) => stderr += data.toString());

    curl.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`curl exited with code ${code}: ${stderr}`));
      }
    });

    curl.on('error', reject);
  });
}

async function main() {
  console.log('Fetching ticket data...\n');

  // Clean and recreate output directories
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(PAGES_DIR, { recursive: true });

  const indexData = {
    fetchedAt: new Date().toISOString(),
    pages: {}
  };

  let totalCities = 0;

  for (const page of PAGES) {
    console.log(`Fetching ${page.name}...`);
    const pageFile = join(PAGES_DIR, `${page.id}.json`);

    try {
      const html = await fetchPage(page.url);
      const data = parseTicketsHtml(html, page.id);

      // Save individual page file
      writeFileSync(pageFile, JSON.stringify(data, null, 2));

      // Add to index
      indexData.pages[page.id] = {
        updatedAt: data.updatedAt,
        cities: data.cities.length,
        cityList: data.cities.map(c => c.city),
      };

      totalCities += data.cities.length;
      console.log(`  ✓ Got ${data.cities.length} cities`);
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);

      // Save error state
      const errorData = { error: error.message, cities: [], pageId: page.id, updatedAt: '' };
      writeFileSync(pageFile, JSON.stringify(errorData, null, 2));

      indexData.pages[page.id] = {
        error: error.message,
        cities: 0,
        cityList: [],
      };
    }
  }

  // Write index file
  writeFileSync(join(OUTPUT_DIR, 'index.json'), JSON.stringify(indexData, null, 2));

  console.log(`\n✅ Data saved to public/data/`);
  console.log(`   Index: public/data/index.json`);
  console.log(`   Pages: public/data/pages/*.json`);
  console.log(`   Total cities: ${totalCities}`);
}

main().catch(console.error);
