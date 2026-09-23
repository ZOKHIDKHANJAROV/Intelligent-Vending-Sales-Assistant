"use client";

import { useEffect, useState } from "react";

type Lead = {
  id: number;
  name: string;
  phone: string;
  message: string;
  product_slug: string | null;
  source: string;
  status: "new" | "contacted" | "closed";
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LeadsPage() {
  const [key, setKey] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  async function load(adminKey: string) {
    const response = await fetch(`${API_URL}/api/v1/leads/admin`, {
      headers: { "X-Admin-Key": adminKey },
    });
    if (!response.ok) {
      setError("Неверный ADMIN_API_KEY.");
      return;
    }
    setLeads(await response.json());
    setReady(true);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("vendai_admin_key");
    if (saved) { setKey(saved); load(saved); }
  }, []);

  async function changeStatus(id: number, status: string) {
    await fetch(`${API_URL}/api/v1/leads/${id}/status?status=${status}`, {
      method: "PATCH",
      headers: { "X-Admin-Key": key },
    });
    await load(key);
  }

  if (!ready) {
    return (
      <main className="admin-page">
        <div className="admin-login">
          <span className="eyebrow">VENDAI ADMIN</span>
          <h1>Заявки</h1>
          <form onSubmit={(e) => { e.preventDefault(); window.localStorage.setItem("vendai_admin_key", key); load(key); }}>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="ADMIN_API_KEY" />
            <button className="button button-primary" type="submit">Войти</button>
          </form>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="container admin-container">
        <div className="admin-header">
          <div><span className="eyebrow">VENDAI ADMIN</span><h1>Заявки покупателей</h1></div>
          <div className="admin-header-actions">
            <a className="button button-secondary" href="/admin">Каталог</a>
            <a className="button button-secondary" href="/">Сайт</a>
          </div>
        </div>

        <div className="admin-products">
          {leads.length === 0 && <div className="catalog-empty">Новых заявок пока нет.</div>}
          {leads.map((lead) => (
            <article className="lead-row" key={lead.id}>
              <div>
                <div className="lead-row-top">
                  <strong>{lead.name}</strong>
                  <span className={`lead-status lead-${lead.status}`}>{lead.status}</span>
                </div>
                <a className="lead-phone" href={`tel:${lead.phone}`}>{lead.phone}</a>
                {lead.product_slug && <p>Товар: {lead.product_slug}</p>}
                {lead.message && <p>{lead.message}</p>}
              </div>
              <div className="admin-row-actions">
                {lead.status !== "contacted" && lead.status !== "closed" && (
                  <button className="button button-secondary" onClick={() => changeStatus(lead.id, "contacted")} type="button">Связались</button>
                )}
                {lead.status !== "closed" && (
                  <button className="button button-secondary" onClick={() => changeStatus(lead.id, "closed")} type="button">Закрыть</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
