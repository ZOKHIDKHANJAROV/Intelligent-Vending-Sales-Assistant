export default function HomePage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px", fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 80 }}>
        <strong style={{ fontSize: 28 }}>VendAI</strong>
        <nav style={{ display: "flex", gap: 24 }}>
          <a href="#catalog">Каталог</a>
          <a href="#about">О компании</a>
          <a href="#contacts">Контакты</a>
        </nav>
      </header>

      <section style={{ marginBottom: 90 }}>
        <p style={{ marginBottom: 12 }}>Вендинговые аппараты для бизнеса</p>
        <h1 style={{ fontSize: 56, lineHeight: 1.05, maxWidth: 800, margin: "0 0 24px" }}>
          Подберите вендинговый аппарат под ваш бизнес
        </h1>
        <p style={{ fontSize: 20, maxWidth: 700, lineHeight: 1.5 }}>
          Каталог оборудования, характеристики, цены и AI-консультант для покупателей.
        </p>
        <div style={{ display: "flex", gap: 16, marginTop: 28 }}>
          <a href="#catalog">Смотреть каталог</a>
          <a href="#contacts">Получить предложение</a>
        </div>
      </section>

      <section id="catalog" style={{ marginBottom: 90 }}>
        <h2>Каталог</h2>
        <p>Раздел будет подключен к PostgreSQL с реальными товарами клиента.</p>
      </section>

      <section id="about" style={{ marginBottom: 90 }}>
        <h2>О компании</h2>
        <p>Здесь будет информация о компании, доставке, установке и сервисе.</p>
      </section>

      <section id="contacts">
        <h2>Контакты</h2>
        <p>Здесь будет форма заявки и контакты отдела продаж.</p>
      </section>

      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          border: "1px solid #ddd",
          borderRadius: 16,
          padding: "14px 18px",
          background: "#fff",
          boxShadow: "0 8px 30px rgba(0,0,0,.08)",
        }}
      >
        AI-консультант
      </div>
    </main>
  );
}
