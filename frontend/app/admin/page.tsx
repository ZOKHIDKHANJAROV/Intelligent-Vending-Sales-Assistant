"use client";

import { FormEvent, useEffect, useState } from "react";

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
  is_active: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const emptyForm = {
  slug: "", name: "", model: "", category: "Вода", description: "",
  price: "", currency: "UZS", image_url: "", availability: "Под заказ",
  warranty_months: "12", specifications: "", advantages: "", is_active: true,
};

function formFromProduct(p: Product) {
  return {
    slug: p.slug, name: p.name, model: p.model, category: p.category,
    description: p.description, price: p.price == null ? "" : String(p.price),
    currency: p.currency, image_url: p.image_url ?? "", availability: p.availability,
    warranty_months: String(p.warranty_months),
    specifications: Object.entries(p.specifications).map(([k,v]) => `${k}: ${v}`).join("\n"),
    advantages: p.advantages.join("\n"), is_active: p.is_active,
  };
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("vendai_admin_key");
    if (saved) { setKey(saved); loadProducts(saved); }
  }, []);

  async function loadProducts(adminKey = key) {
    const response = await fetch(`${API_URL}/api/v1/admin/products`, {
      headers: { "X-Admin-Key": adminKey },
    });
    if (!response.ok) {
      setAuthenticated(false);
      setMessage("Неверный ADMIN_API_KEY или сервер не настроен.");
      return;
    }
    setProducts(await response.json());
    setAuthenticated(true);
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    window.localStorage.setItem("vendai_admin_key", key);
    await loadProducts(key);
  }

  function logout() {
    window.localStorage.removeItem("vendai_admin_key");
    setAuthenticated(false);
    setKey("");
    setProducts([]);
  }

  function parseSpecs(value: string) {
    return Object.fromEntries(value.split("\n").map(x => x.trim()).filter(Boolean).map(line => {
      const i = line.indexOf(":");
      return i === -1 ? [line, ""] : [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const payload = {
      slug: form.slug.trim(), name: form.name.trim(), model: form.model.trim(),
      category: form.category.trim(), description: form.description.trim(),
      price: form.price === "" ? null : Number(form.price), currency: form.currency.trim() || "UZS",
      image_url: form.image_url.trim() || null, availability: form.availability.trim(),
      warranty_months: Number(form.warranty_months), specifications: parseSpecs(form.specifications),
      advantages: form.advantages.split("\n").map(x => x.trim()).filter(Boolean),
      is_active: form.is_active,
    };
    const url = editingId
      ? `${API_URL}/api/v1/admin/products/${editingId}`
      : `${API_URL}/api/v1/admin/products`;
    const response = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": key },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      setMessage(error.detail ?? "Не удалось сохранить товар.");
      return;
    }
    setMessage(editingId ? "Товар обновлён." : "Товар добавлен.");
    setForm(emptyForm);
    setEditingId(null);
    await loadProducts();
  }

  async function remove(product: Product) {
    if (!window.confirm(`Удалить «${product.name}»?`)) return;
    const response = await fetch(`${API_URL}/api/v1/admin/products/${product.id}`, {
      method: "DELETE", headers: { "X-Admin-Key": key },
    });
    if (response.ok) { setMessage("Товар удалён."); await loadProducts(); }
  }

  if (!authenticated) return (
    <main className="admin-page">
      <div className="admin-login">
        <span className="eyebrow">VENDAI ADMIN</span>
        <h1>Управление каталогом</h1>
        <p>Введите ADMIN_API_KEY из серверного .env.</p>
        <form onSubmit={login}>
          <input type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="ADMIN_API_KEY" autoFocus />
          <button className="button button-primary" type="submit">Войти</button>
        </form>
        {message && <p className="admin-error">{message}</p>}
      </div>
    </main>
  );

  return (
    <main className="admin-page">
      <div className="container admin-container">
        <div className="admin-header">
          <div><span className="eyebrow">VENDAI ADMIN</span><h1>Каталог товаров</h1></div>
          <div className="admin-header-actions">
            <a className="button button-secondary" href="/catalog">Открыть сайт</a>
            <button className="button button-secondary" onClick={logout} type="button">Выйти</button>
          </div>
        </div>
        {message && <div className="admin-message">{message}</div>}

        <section className="admin-form-card">
          <div className="admin-section-title">
            <div><span className="eyebrow">{editingId ? "РЕДАКТИРОВАНИЕ" : "НОВЫЙ ТОВАР"}</span><h2>{editingId ? "Изменить товар" : "Добавить товар"}</h2></div>
            {editingId && <button className="button button-secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }} type="button">Отмена</button>}
          </div>
          <form className="admin-form" onSubmit={save}>
            <div className="admin-form-grid">
              <label>Название<input required value={form.name} onChange={e => setForm({...form,name:e.target.value})}/></label>
              <label>Модель<input required value={form.model} onChange={e => setForm({...form,model:e.target.value})}/></label>
              <label>Slug<input required value={form.slug} onChange={e => setForm({...form,slug:e.target.value})}/></label>
              <label>Категория<input required value={form.category} onChange={e => setForm({...form,category:e.target.value})}/></label>
              <label>Цена<input type="number" min="0" value={form.price} onChange={e => setForm({...form,price:e.target.value})} placeholder="Пусто = по запросу"/></label>
              <label>Валюта<input value={form.currency} onChange={e => setForm({...form,currency:e.target.value})}/></label>
              <label>Наличие<input value={form.availability} onChange={e => setForm({...form,availability:e.target.value})}/></label>
              <label>Гарантия, месяцев<input type="number" min="0" value={form.warranty_months} onChange={e => setForm({...form,warranty_months:e.target.value})}/></label>
              <label className="admin-full">URL изображения<input value={form.image_url} onChange={e => setForm({...form,image_url:e.target.value})}/></label>
              <label className="admin-full">Описание<textarea rows={5} value={form.description} onChange={e => setForm({...form,description:e.target.value})}/></label>
              <label className="admin-full">Характеристики — одна строка: Название: значение<textarea rows={8} value={form.specifications} onChange={e => setForm({...form,specifications:e.target.value})}/></label>
              <label className="admin-full">Преимущества — по одному на строку<textarea rows={7} value={form.advantages} onChange={e => setForm({...form,advantages:e.target.value})}/></label>
              <label className="admin-checkbox"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form,is_active:e.target.checked})}/> Показывать в каталоге</label>
            </div>
            <button className="button button-primary" type="submit">{editingId ? "Сохранить изменения" : "Добавить товар"}</button>
          </form>
        </section>

        <section>
          <div className="admin-section-title"><div><span className="eyebrow">ТОВАРЫ</span><h2>Все товары ({products.length})</h2></div></div>
          <div className="admin-products">
            {products.map(product => (
              <article className="admin-product-row" key={product.id}>
                <div><span className="product-category">{product.category}</span><h3>{product.name}</h3><p>Модель: {product.model} · {product.availability}</p></div>
                <div className="admin-row-actions">
                  <span className={product.is_active ? "admin-active" : "admin-inactive"}>{product.is_active ? "Активен" : "Скрыт"}</span>
                  <button className="button button-secondary" onClick={() => {setEditingId(product.id);setForm(formFromProduct(product));window.scrollTo({top:0,behavior:"smooth"});}} type="button">Изменить</button>
                  <button className="button button-danger" onClick={() => remove(product)} type="button">Удалить</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
