import { Link } from 'react-router-dom'
import { CATEGORIES } from '../types'

function HomePage() {
  const featuredCategories = CATEGORIES.filter(c => c.type === 'featured')
  const cheapCategories = CATEGORIES.filter(c => c.type === 'cheap')

  const renderCategoryCards = (categories: typeof CATEGORIES) => {
    return (
      <div className="category-grid">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/tickets/${category.id}`}
            className="category-card fade-in"
            style={{ animationDelay: `${Math.random() * 0.2}s` }}
          >
            <div className="category-card-title">{category.title}</div>
            <div className="category-card-meta">
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                {category.days} дней
              </span>
              <span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                {category.stops === 0 ? 'Без пересадок' : `${category.stops}+ пересадок`}
              </span>
            </div>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div>
      <section className="hero">
        <h1 className="hero-title">Авиабилеты из России</h1>
        <p className="hero-subtitle">
          Удобный поиск дешёвых авиабилетов с фильтрами по стране, городу, дате и цене
        </p>
      </section>

      <section className="category-section">
        <h2 className="category-section-title">
          <span className="icon">⭐</span>
          Избранные билеты
        </h2>
        {renderCategoryCards(featuredCategories)}
      </section>

      <section className="category-section">
        <h2 className="category-section-title">
          <span className="icon">💰</span>
          Дешёвые билеты
        </h2>
        {renderCategoryCards(cheapCategories)}
      </section>
    </div>
  )
}

export default HomePage
