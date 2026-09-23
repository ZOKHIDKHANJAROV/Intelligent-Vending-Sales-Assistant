import Catalog from "./catalog/Catalog";
import LeadForm from "./components/LeadForm";
import AIChat from "./components/AIChat";

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <div className="container header-inner">
          <a className="logo" href="/">
            <span className="logo-mark">V</span>
            <span>VendAI</span>
          </a>
          <nav>
            <a href="#catalog">Каталог</a>
            <a href="#advantages">Преимущества</a>
            <a href="#about">О компании</a>
            <a href="#contacts">Контакты</a>
          </nav>
          <a className="header-phone" href="#contacts">Получить предложение</a>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">ВЕНДИНГОВОЕ ОБОРУДОВАНИЕ</div>
            <h1>Автоматы для продажи воды и готовых напитков</h1>
            <p className="hero-text">
              Оборудование для бизнеса с автоматизированной продажей,
              очисткой и выдачей воды. Подберём модель под вашу задачу.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#catalog">Смотреть каталог</a>
              <a className="button button-secondary" href="#contacts">Получить расчёт</a>
            </div>
            <div className="hero-stats">
              <div><strong>250 л/ч</strong><span>производительность XL-01</span></div>
              <div><strong>9 этапов</strong><span>очистки воды</span></div>
              <div><strong>12 мес.</strong><span>гарантия</span></div>
            </div>
          </div>

          <div className="hero-product">
            <div className="product-glow" />
            <div className="machine-card">
              <div className="machine-top">
                <span>ATLANT FORTUNA</span>
                <span>XL-01</span>
              </div>
              <div className="machine-body">
                <div className="screen">WATER<br /><small>VENDING</small></div>
                <div className="machine-panel"><span /><span /><span /></div>
                <div className="dispense">ВЫДАЧА<br />ВОДЫ</div>
              </div>
              <div className="machine-base" />
            </div>
            <div className="product-badge">XL-01<br /><small>ВЕНДИНГ ВОДЫ</small></div>
          </div>
        </div>
      </section>

      <section id="catalog" className="section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">КАТАЛОГ</span>
              <h2>Вендинговые аппараты</h2>
            </div>
            <a className="text-link" href="/catalog">Открыть полный каталог →</a>
          </div>
          <Catalog />
        </div>
      </section>

      <section id="advantages" className="section section-dark">
        <div className="container">
          <span className="eyebrow">ПОЧЕМУ ЭТА МОДЕЛЬ</span>
          <h2>Оборудование для стабильной работы</h2>
          <div className="advantage-grid">
            {[
              ["01", "9-ступенчатая очистка", "Песок, уголь, PP, обратный осмос, УФ, минерализация и озонирование."],
              ["02", "Работа круглый год", "Защита от замерзания и перегрева, отопительный блок и охлаждение."],
              ["03", "Автоматическое управление", "Компьютеризированная плата управления вместо полуавтоматической системы."],
              ["04", "Контроль расхода", "Электросчётчик и водосчётчик для контроля эксплуатации оборудования."],
            ].map(([number, title, text]) => (
              <div className="advantage" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">О КОМПАНИИ</span>
            <h2>Вендинг как готовая бизнес-инфраструктура</h2>
          </div>
          <p>
            Помогаем подобрать оборудование, рассчитать решение под место
            установки и организовать поставку. На сайте можно получить
            характеристики, задать вопрос AI-консультанту и оставить заявку.
          </p>
        </div>
      </section>

      <section id="contacts" className="cta-section">
        <div className="container cta">
          <div>
            <span className="eyebrow">ПОЛУЧИТЬ ПРЕДЛОЖЕНИЕ</span>
            <h2>Расскажите, какой бизнес вы планируете запустить</h2>
            <p>Подберём оборудование и подготовим коммерческое предложение.</p>
          </div>
          <LeadForm />
        </div>
      </section>

      <AIChat />

      <footer>
        <div className="container footer-inner">
          <strong>VendAI</strong>
          <span>Вендинговое оборудование для бизнеса</span>
          <span>© 2026</span>
        </div>
      </footer>
    </main>
  );
}
