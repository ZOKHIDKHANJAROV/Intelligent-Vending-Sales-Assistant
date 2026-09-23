"use client";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  slug: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/v1/products`).then((r) => r.json()),
      fetch(`${API_URL}/api/v1/products/categories/list`).then((r) => r.json()),
    ])
      .then(([productsData, categoriesData]) => {
        setProducts(productsData.items ?? []);
        setCategories(categoriesData ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory = category === "Все" || product.category === category;
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.model.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, category, search]);

  return (
    <div>
      <div className="catalog-toolbar">
        <div className="category-tabs">
          {["Все", ...categories].map((item) => (
            <button
              className={category === item ? "active" : ""}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <input
          className="catalog-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по модели..."
        />
      </div>

      {loading ? (
        <div className="catalog-empty">Загрузка каталога...</div>
      ) : filtered.length === 0 ? (
        <div className="catalog-empty">По вашему запросу товары не найдены.</div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((product) => (
            <article className="catalog-card" key={product.id}>
              <div className="catalog-card-image">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image_url} alt={product.name} />
                ) : (
                  <div className="catalog-machine">
                    <div className="catalog-machine-top">{product.model}</div>
                    <div className="catalog-machine-screen">WATER</div>
                    <div className="catalog-machine-panel"><i /><i /><i /></div>
                    <div className="catalog-machine-output">ВЫДАЧА</div>
                  </div>
                )}
                <span className="catalog-status">{product.availability}</span>
              </div>

              <div className="catalog-card-body">
                <span className="product-category">{product.category}</span>
                <h3>{product.name}</h3>
                <p className="model">Модель: <strong>{product.model}</strong></p>
                <p>{product.description}</p>

                <div className="catalog-specs">
                  {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                    <div key={key}>
                      <span>{key}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <div className="catalog-card-footer">
                  <div>
                    <span>Гарантия</span>
                    <strong>{product.warranty_months} месяцев</strong>
                  </div>
                  <a className="button button-primary" href={`/catalog/${product.slug}`}>
                    Подробнее
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
