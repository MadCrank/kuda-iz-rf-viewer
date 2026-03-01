import type { PageData } from '../types';
import { CATEGORIES } from '../types';

// Data is now fetched at build time by GitHub Actions and served as static JSON
// This completely solves the CORS problem!

const DATA_URL = '/kuda-iz-rf-viewer/data/data.json';

let cachedData: Record<string, PageData> | null = null;

export async function fetchTicketsPage(pageId: string): Promise<PageData> {
  // Check if category exists
  const category = CATEGORIES.find(c => c.id === pageId);
  if (!category) {
    throw new Error(`Категория "${pageId}" не найдена`);
  }

  // Load data if not cached
  if (!cachedData) {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      cachedData = json.pages;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      throw new Error(`Не удалось загрузить данные: ${message}`);
    }
  }

  const pageData = cachedData![pageId];

  if (!pageData) {
    throw new Error(`Данные для категории "${pageId}" не найдены`);
  }

  if (pageData.error) {
    throw new Error(`Ошибка в данных: ${pageData.error}`);
  }

  return pageData;
}

// Get list of available pages with data
export function getAvailablePages(): string[] {
  if (!cachedData) return [];
  return Object.keys(cachedData).filter(id => !cachedData![id].error);
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
