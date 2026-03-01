import type { PageData } from '../types';
import { CATEGORIES } from '../types';

// Data is fetched at build time by GitHub Actions and served as static JSON
// Each page is stored in a separate file for faster loading

const BASE_URL = '/kuda-iz-rf-viewer/data';

// Cache for loaded pages
const pageCache = new Map<string, PageData>();

export async function fetchTicketsPage(pageId: string): Promise<PageData> {
  // Check if category exists
  const category = CATEGORIES.find(c => c.id === pageId);
  if (!category) {
    throw new Error(`Категория "${pageId}" не найдена`);
  }

  // Check cache first
  if (pageCache.has(pageId)) {
    return pageCache.get(pageId)!;
  }

  // Load specific page file
  try {
    const response = await fetch(`${BASE_URL}/pages/${pageId}.json`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: PageData = await response.json();
    pageCache.set(pageId, data);

    if (data.error) {
      throw new Error(`Ошибка в данных: ${data.error}`);
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    throw new Error(`Не удалось загрузить данные: ${message}`);
  }
}

// Get list of available pages with data (loads lightweight index)
export async function getAvailablePages(): Promise<string[]> {
  try {
    const response = await fetch(`${BASE_URL}/index.json`);
    if (!response.ok) return [];

    const index = await response.json();
    return Object.entries(index.pages)
      .filter(([, data]: [string, any]) => !data.error && data.cities > 0)
      .map(([id]: [string, any]) => id);
  } catch {
    return [];
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
