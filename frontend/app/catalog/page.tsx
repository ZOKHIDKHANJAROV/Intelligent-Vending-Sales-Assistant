import Catalog from "./Catalog";

export default function CatalogPage() {
  return (
    <main>
      <header className="site-header">
        <div className="container header-inner">
          <a className="logo" href="/">
            <span className="logo-mark">V</span>
            <span>VendAI</span>
          </a>
          <nav>
            <a href="/">Главная</a>
            <a href="/catalog">Каталог</a>
            <a href="/#about">О компании</a>
            <a href="/#contacts">Контакты</a>
          </nav>
          <a className="header-phone" href="/#contacts">Получить предложение</a>
        </div>
      </header>

      <section className="catalog-page">
        <div className="container">
          <span className="eyebrow">КАТАЛОГ</span>
          <h1 className="catalog-title">Вендинговые аппараты</h1>
          <p className="catalog-subtitle">
            Оборудование для автоматизированной продажи воды и других продуктов.
            Сравнивайте характеристики и выбирайте подходящую модель.
          </p>
          <Catalog />
        </div>
      </section>
    </main>
  );
}
