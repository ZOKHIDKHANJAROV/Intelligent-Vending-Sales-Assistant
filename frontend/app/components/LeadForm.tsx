"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function LeadForm({ productSlug }: { productSlug?: string }) {
  const [form, setForm] = useState({ name: "", phone: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState("sending");

    try {
      const response = await fetch(`${API_URL}/api/v1/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, product_slug: productSlug, source: "website" }),
      });

      if (!response.ok) throw new Error("Request failed");

      setForm({ name: "", phone: "", message: "" });
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <form className="lead-form" onSubmit={submit}>
      <input
        required
        placeholder="Ваше имя"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        required
        placeholder="Телефон"
        type="tel"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <textarea
        placeholder="Что вас интересует?"
        rows={4}
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
      />
      <button className="button button-primary" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Отправка..." : "Отправить заявку"}
      </button>
      {state === "success" && <p className="form-success">Заявка отправлена. Мы свяжемся с вами.</p>}
      {state === "error" && <p className="form-error">Не удалось отправить заявку. Попробуйте ещё раз.</p>}
    </form>
  );
}
