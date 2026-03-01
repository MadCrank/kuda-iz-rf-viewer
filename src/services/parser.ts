import type { Ticket, CityTickets, RouteTickets, PageData } from '../types';

const BASE_URL = 'https://xn--80ahkdh8c.xn--p1ai';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function parsePrice(text: string): { price: number; currency: string } {
  const match = text.match(/(\d+)\s*(₽|\$|€)/);
  if (match) {
    return { price: parseInt(match[1], 10), currency: match[2] };
  }
  return { price: 0, currency: '₽' };
}

export function parseTicketsHtml(html: string): PageData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const cities: CityTickets[] = [];
  let updatedAt = '';

  // Find update time
  const updateMatch = html.match(/Обновлено<\/b>:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  if (updateMatch) {
    updatedAt = updateMatch[1];
  }

  // Find all city sections (details elements with city names)
  const detailsElements = doc.querySelectorAll('.ListOfGroupTickets details, .ListOfTickets details');

  detailsElements.forEach((detail) => {
    const summary = detail.querySelector('summary');
    if (!summary) return;

    const cityHeading = summary.querySelector('h3');
    if (!cityHeading) return;

    const cityName = cityHeading.textContent?.trim() || '';
    if (!cityName) return;

    const routes: RouteTickets[] = [];
    let currentCountry = '';

    // Parse the content inside details
    const content = detail.innerHTML;

    // Split by country headers (H3 tags)
    const parts = content.split(/<H3>([^<]+)<\/H3>/i);

    for (let i = 1; i < parts.length; i += 2) {
      currentCountry = parts[i].trim();
      const routeContent = parts[i + 1] || '';

      // Parse routes in this country section
      const routeMatches = routeContent.split(/<b>([^<]+)<\/b>/);

      for (let j = 1; j < routeMatches.length; j += 2) {
        const routeName = routeMatches[j].trim();
        const ticketContent = routeMatches[j + 1] || '';

        // Skip non-route elements
        if (!routeName.includes('-')) continue;

        const [fromCity, toCity] = routeName.split('-').map(s => s.trim());
        if (!fromCity || !toCity) continue;

        const tickets: Ticket[] = [];

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
  });

  return { updatedAt, cities };
}

export async function fetchTicketsPage(url: string): Promise<PageData> {
  const fullUrl = `${BASE_URL}/${url}`;

  // Try direct fetch first, then fallback to CORS proxy
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    return parseTicketsHtml(html);
  } catch (error) {
    // Try with CORS proxy
    const corsProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(fullUrl)}`,
    ];

    for (const proxyUrl of corsProxies) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const html = await response.text();
          return parseTicketsHtml(html);
        }
      } catch {
        continue;
      }
    }

    throw new Error('Failed to fetch tickets data');
  }
}

// Extract all unique values for filters
export function extractFilterOptions(data: PageData) {
  const countries = new Set<string>();
  const cities = new Set<string>();
  const dates = new Set<string>();
  const stops = new Set<number>();
  let minPrice = Infinity;
  let maxPrice = 0;

  data.cities.forEach(city => {
    cities.add(city.city);
    city.routes.forEach(route => {
      countries.add(route.country);
      route.tickets.forEach(ticket => {
        dates.add(ticket.date);
        stops.add(ticket.stops);
        minPrice = Math.min(minPrice, ticket.price);
        maxPrice = Math.max(maxPrice, ticket.price);
      });
    });
  });

  return {
    countries: Array.from(countries).sort(),
    cities: Array.from(cities).sort(),
    dates: Array.from(dates).sort(),
    stops: Array.from(stops).sort((a, b) => a - b),
    priceRange: { min: minPrice === Infinity ? 0 : minPrice, max: maxPrice },
  };
}
