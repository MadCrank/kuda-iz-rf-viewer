import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Ticket, PageData } from '../types'
import { CATEGORIES, DEFAULT_CITY } from '../types'
import { fetchTicketsPage } from '../services/parser'

interface Filters {
  country: string
  toCity: string
  dateFrom: string
  dateTo: string
  maxStops: string
  maxPrice: string
}

function TicketsPage() {
  const { type } = useParams<{ type: string }>()
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY)
  const [filters, setFilters] = useState<Filters>({
    country: '',
    toCity: '',
    dateFrom: '',
    dateTo: '',
    maxStops: '',
    maxPrice: '',
  })

  const category = CATEGORIES.find(c => c.id === type)

  useEffect(() => {
    if (!category) return

    setLoading(true)
    setError(null)

    fetchTicketsPage(category.id)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [category])

  // Get available cities from data
  const cities = useMemo(() => {
    if (!data) return []
    return data.cities.map(c => c.city)
  }, [data])

  // Get current city data
  const cityData = useMemo(() => {
    if (!data) return null
    return data.cities.find(c => c.city === selectedCity)
  }, [data, selectedCity])

  // Extract all tickets for current city
  const allTickets = useMemo(() => {
    if (!cityData) return []
    const tickets: Ticket[] = []
    cityData.routes.forEach(route => {
      tickets.push(...route.tickets)
    })
    return tickets
  }, [cityData])

  // Get filter options
  const filterOptions = useMemo(() => {
    if (!cityData) return { countries: [], cities: [], dates: [], stops: [], priceRange: { min: 0, max: 0 } }

    const countries = new Set<string>()
    const toCities = new Set<string>()
    const dates = new Set<string>()
    const stops = new Set<number>()
    let minPrice = Infinity
    let maxPrice = 0

    cityData.routes.forEach(route => {
      countries.add(route.country)
      toCities.add(route.toCity)
      route.tickets.forEach(ticket => {
        dates.add(ticket.date)
        stops.add(ticket.stops)
        minPrice = Math.min(minPrice, ticket.price)
        maxPrice = Math.max(maxPrice, ticket.price)
      })
    })

    return {
      countries: Array.from(countries).sort(),
      cities: Array.from(toCities).sort(),
      dates: Array.from(dates).sort(),
      stops: Array.from(stops).sort((a, b) => a - b),
      priceRange: { min: minPrice === Infinity ? 0 : minPrice, max: maxPrice },
    }
  }, [cityData])

  // Apply filters
  const filteredTickets = useMemo(() => {
    return allTickets.filter(ticket => {
      if (filters.country && ticket.country !== filters.country) return false
      if (filters.toCity && ticket.toCity !== filters.toCity) return false
      if (filters.dateFrom && ticket.date < filters.dateFrom) return false
      if (filters.dateTo && ticket.date > filters.dateTo) return false
      if (filters.maxStops && ticket.stops > parseInt(filters.maxStops)) return false
      if (filters.maxPrice && ticket.price > parseInt(filters.maxPrice)) return false
      return true
    })
  }, [allTickets, filters])

  const resetFilters = () => {
    setFilters({
      country: '',
      toCity: '',
      dateFrom: '',
      dateTo: '',
      maxStops: '',
      maxPrice: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  if (!category) {
    return (
      <div className="error-container">
        <div className="error-icon">🔍</div>
        <h2 className="error-title">Категория не найдена</h2>
        <p className="error-text">Выберите категорию на главной странице</p>
        <Link to="/" className="retry-btn">На главную</Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Загружаем билеты...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2 className="error-title">Ошибка загрузки</h2>
        <p className="error-text">{error}</p>
        <button onClick={() => window.location.reload()} className="retry-btn">
          Попробовать снова
        </button>
      </div>
    )
  }

  return (
    <div>
      <Link to="/" className="back-link">
        ← На главную
      </Link>

      <div className="page-header">
        <h1 className="page-title">{category.title}</h1>
        {data?.updatedAt && (
          <div className="updated-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Обновлено: {data.updatedAt}
          </div>
        )}
      </div>

      {/* City Selector */}
      <div className="city-selector">
        <span className="city-selector-label">Вылет из:</span>
        <div className="city-chips">
          {cities.slice(0, 10).map(city => (
            <button
              key={city}
              className={`city-chip ${city === selectedCity ? 'active' : ''}`}
              onClick={() => setSelectedCity(city)}
            >
              {city}
            </button>
          ))}
          {cities.length > 10 && (
            <select
              className="filter-select"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ width: 'auto' }}
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <h3 className="filters-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Фильтры
          </h3>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="filters-reset">
              Сбросить
            </button>
          )}
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">Страна</label>
            <select
              className="filter-select"
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            >
              <option value="">Все страны</option>
              {filterOptions.countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Город назначения</label>
            <select
              className="filter-select"
              value={filters.toCity}
              onChange={(e) => setFilters({ ...filters, toCity: e.target.value })}
            >
              <option value="">Все города</option>
              {filterOptions.cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Дата от</label>
            <input
              type="text"
              className="filter-input"
              placeholder="ДД.ММ.ГГ"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Дата до</label>
            <input
              type="text"
              className="filter-input"
              placeholder="ДД.ММ.ГГ"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Макс. пересадок</label>
            <select
              className="filter-select"
              value={filters.maxStops}
              onChange={(e) => setFilters({ ...filters, maxStops: e.target.value })}
            >
              <option value="">Любое количество</option>
              <option value="0">Без пересадок</option>
              <option value="1">До 1 пересадки</option>
              <option value="2">До 2 пересадок</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Макс. цена (₽)</label>
            <input
              type="number"
              className="filter-input"
              placeholder={filterOptions.priceRange.max.toString()}
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="tickets-section">
        <div className="tickets-header">
          <h3>
            {cityData?.city || 'Билеты'}
          </h3>
          <span className="tickets-count">
            {filteredTickets.length} билетов
          </span>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <p>Билеты не найдены. Попробуйте изменить фильтры.</p>
          </div>
        ) : (
          <div className="tickets-table-wrapper">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Маршрут</th>
                  <th>Страна</th>
                  <th>Дата</th>
                  <th>Пересадки</th>
                  <th>Цена</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <div className="route-cell">
                        <span>{ticket.fromCity}</span>
                        <span className="route-arrow">→</span>
                        <span>{ticket.toCity}</span>
                      </div>
                    </td>
                    <td>
                      <span className="country-badge">{ticket.country}</span>
                    </td>
                    <td>{ticket.date}</td>
                    <td>
                      <span className={`stops-badge stops-${Math.min(ticket.stops, 2)}`}>
                        {ticket.stops === 0 ? '0' : ticket.stops}
                      </span>
                    </td>
                    <td>
                      <span className="price-cell">
                        {ticket.price.toLocaleString()} {ticket.currency}
                      </span>
                    </td>
                    <td>
                      <a
                        href={ticket.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="action-btn"
                      >
                        Купить
                      </a>
                      {ticket.hotelLink && (
                        <a
                          href={ticket.hotelLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hotel-link"
                          title="Найти отель"
                        >
                          🏠
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TicketsPage
