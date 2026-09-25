import Catalog from "./Catalog";
import { CONTACT } from "../lib/contacts";

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
            <a href="/catalog" className="active-nav">Каталог</a>
            <a href="/vending-3d" style={{ color: "var(--accent)", fontWeight: 700 }}>✨ 3D Вид XL-01</a>
            <a href="/#about">О компании</a>
            <a href="/#contacts">Контакты</a>
          </nav>
          <a className="header-tel" href={`tel:${CONTACT.tel}`}>{CONTACT.phone}</a>
          <a className="header-phone" href="/#contacts">Получить предложение</a>
        </div>
      </header>

      <section className="catalog-page">
        <div className="container">
          <div style={{
            background: "linear-gradient(90deg, #07264a, #0b1c31)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" }}>НОВИНКА В КАТАЛОГЕ</span>
              <h3 style={{ margin: "4px 0", fontSize: "19px" }}>Интерактивный 3D-обзор автомата воды XL-01</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "13px" }}>
                Осмотрите автомат со всех сторон (360°), проверьте внутреннюю 9-ступенчатую систему очистки и налив.
              </p>
            </div>
            <a className="button button-accent-3d" href="/vending-3d">
              Открыть 3D-модель →
            </a>
          </div>

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
