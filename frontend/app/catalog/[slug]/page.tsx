"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API_URL, apiFetch } from "../../lib/api";

type Product = {
  name: string;
  model: string;
  category: string;
  description: string;
  price: number | null;
  currency: string;
  image_url: string | null;
  availability: string;
  warranty_months: number;
  specifications: Record<string, string>;
  advantages: string[];
};


export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API_URL}/api/v1/products/${params.slug}`)
      .then((response) => {
        if (!response.ok) throw new Error("Product not found");
        return response.json();
      })
      .then(setProduct)
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return <main className="product-page"><div className="container catalog-empty">Загрузка товара...</div></main>;
  }

  if (!product) {
    return <main className="product-page"><div className="container catalog-empty">Товар не найден.</div></main>;
  }

  return (
    <main>
      <header className="site-header">
        <div className="container header-inner">
          <a className="logo" href="/"><span className="logo-mark">V</span><span>VendAI</span></a>
          <nav>
            <a href="/">Главная</a>
            <a href="/catalog">Каталог</a>
            <a href="/vending-3d" style={{ color: "var(--accent)", fontWeight: 700 }}>✨ 3D Вид XL-01</a>
            <a href="/#about">О компании</a>
            <a href="/#contacts">Контакты</a>
          </nav>
          <a className="header-phone" href="/#contacts">Получить предложение</a>
        </div>
      </header>

      <section className="product-page">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <a className="back-link" href="/catalog">← Вернуться в каталог</a>
            <a className="button button-accent-3d" href="/vending-3d" style={{ minHeight: "38px", padding: "0 14px", fontSize: "12px" }}>
              ✨ Смотреть в 3D (360°)
            </a>
          </div>

          <div className="product-detail">
            <div className="product-detail-visual">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} />
              ) : (
                <div className="catalog-machine detail-machine">
                  <div className="catalog-machine-top">{product.model}</div>
                  <div className="catalog-machine-screen">WATER</div>
                  <div className="catalog-machine-panel"><i /><i /><i /></div>
                  <div className="catalog-machine-output">ВЫДАЧА</div>
                </div>
              )}
            </div>

            <div className="product-detail-info">
              <span className="eyebrow">{product.category.toUpperCase()}</span>
              <h1>{product.name}</h1>
              <p className="model">Модель: <strong>{product.model}</strong></p>
              <p className="detail-description">{product.description}</p>

              <div className="detail-meta">
                <div><span>Статус</span><strong>{product.availability}</strong></div>
                <div><span>Гарантия</span><strong>{product.warranty_months} месяцев</strong></div>
                <div><span>Цена</span><strong>{product.price ? `${product.price.toLocaleString("ru-RU")} ${product.currency}` : "По запросу"}</strong></div>
              </div>

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
                <a className="button button-accent-3d" href="/vending-3d">
                  ✨ Открыть в 3D (360° / Рентген / Налив)
                </a>
                <a className="button button-primary detail-cta" href="/#contacts" style={{ marginTop: 0 }}>
                  Получить коммерческое предложение
                </a>
              </div>
            </div>
          </div>

          <div className="detail-sections">
            <section>
              <span className="eyebrow">ХАРАКТЕРИСТИКИ</span>
              <h2>Технические характеристики</h2>
              <div className="detail-spec-list">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key}><span>{key}</span><strong>{value}</strong></div>
                ))}
              </div>
            </section>

            <section>
              <span className="eyebrow">ПРЕИМУЩЕСТВА</span>
              <h2>Особенности оборудования</h2>
              <div className="advantage-list">
                {product.advantages.map((advantage, index) => (
                  <div key={advantage}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{advantage}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
