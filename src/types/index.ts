export interface Ticket {
  id: string;
  fromCity: string;
  toCity: string;
  country: string;
  date: string;
  stops: number;
  price: number;
  currency: string;
  link: string;
  hotelLink?: string;
}

export interface CityTickets {
  city: string;
  routes: RouteTickets[];
}

export interface RouteTickets {
  fromCity: string;
  toCity: string;
  country: string;
  tickets: Ticket[];
}

export interface PageData {
  updatedAt: string;
  cities: CityTickets[];
}

export type CategoryType = 'featured' | 'cheap';

export interface Category {
  id: string;
  type: CategoryType;
  title: string;
  url: string;
  days: number;
  stops: number;
}

export const CATEGORIES: Category[] = [
  // Избранные
  { id: 'featured-120-2', type: 'featured', title: 'Ближайшие 120 дней, с пересадками', url: 'samye-deshevye-aviabilety-po-miru-120-2.html', days: 120, stops: 2 },
  { id: 'featured-30-2', type: 'featured', title: 'Ближайшие 30 дней, с пересадками', url: 'samye-deshevye-aviabilety-po-miru-30-2.html', days: 30, stops: 2 },
  { id: 'featured-365-2', type: 'featured', title: 'Ближайшие 365 дней, с пересадками', url: 'samye-deshevye-aviabilety-po-miru-365-2.html', days: 365, stops: 2 },
  // Дешёвые
  { id: 'cheap-120-0', type: 'cheap', title: 'Ближайшие 120 дней, без пересадок', url: 'deshevye-aviabilety-po-miru-120-0.html', days: 120, stops: 0 },
  { id: 'cheap-120-2', type: 'cheap', title: 'Ближайшие 120 дней, с пересадками', url: 'deshevye-aviabilety-po-miru-120-2.html', days: 120, stops: 2 },
  { id: 'cheap-30-0', type: 'cheap', title: 'Ближайшие 30 дней, без пересадок', url: 'deshevye-aviabilety-po-miru-30-0.html', days: 30, stops: 0 },
  { id: 'cheap-30-2', type: 'cheap', title: 'Ближайшие 30 дней, с пересадками', url: 'deshevye-aviabilety-po-miru-30-2.html', days: 30, stops: 2 },
  { id: 'cheap-365-0', type: 'cheap', title: 'Ближайшие 365 дней, без пересадок', url: 'deshevye-aviabilety-po-miru-365-0.html', days: 365, stops: 0 },
  { id: 'cheap-365-2', type: 'cheap', title: 'Ближайшие 365 дней, с пересадками', url: 'deshevye-aviabilety-po-miru-365-2.html', days: 365, stops: 2 },
];

export const DEFAULT_CITY = 'Екатеринбург';
