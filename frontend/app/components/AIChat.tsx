"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { API_URL, apiFetch } from "../lib/api";

type Message = { role: "user" | "assistant"; content: string };
type LeadFormState = { name: string; phone: string; message: string };

const initial: Message = {
  role: "assistant",
  content: "Здравствуйте. Я AI-консультант VendAI. Сначала могу проконсультировать по моделям и их характеристикам. Затем помогу подобрать аппарат под вашу задачу и, если потребуется, оформить заявку менеджеру.",
};

const quickActions = [
  ["Характеристики моделей", "Какие модели доступны и какие у них характеристики?"],
  ["Характеристики XL-01", "Расскажите характеристики XL-01."],
  ["Подобрать аппарат", "Хочу подобрать аппарат для бизнеса."],
  ["Цена", "Сколько стоит аппарат?"],
];

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([initial]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [wizardStep, setWizardStep] = useState<number | null>(null);
  const [wizard, setWizard] = useState({ purpose: "", location: "", volume: "", water_source: "" });
  const [salesContext, setSalesContext] = useState<Record<string, string>>({});
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadProductSlug, setLeadProductSlug] = useState<string | undefined>(undefined);
  const [lead, setLead] = useState<LeadFormState>({ name: "", phone: "", message: "" });
  const [leadState, setLeadState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function submitText(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;

    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setMessage("");
    setLoading(true);
    setStreaming(false);

    let answer = "";
    try {
      const response = await apiFetch(`${API_URL}/api/v1/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: messages.slice(-8),
          sales_context: salesContext,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Chat request failed");

      // Печатаем ответ по мере генерации моделью
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        if (!answer) continue;
        setStreaming(true);
        setMessages([...next, { role: "assistant", content: answer }]);
      }
      answer += decoder.decode();
      if (!answer.trim()) throw new Error("Empty answer");
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch {
      const fallback = "Не удалось связаться с AI-консультантом. Оставьте заявку, и менеджер свяжется с вами.";
      setMessages([...next, { role: "assistant", content: answer ? `${answer}\n\n${fallback}` : fallback }]);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submitText(message);
  }

  async function submitLead(event: FormEvent) {
    event.preventDefault();
    setLeadState("sending");
    try {
      const response = await apiFetch(API_URL + "/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, product_slug: leadProductSlug, source: "website" }),
      });
      if (!response.ok) throw new Error("Lead request failed");
      setLeadState("success");
      setMessages((prev) => [...prev, { role: "assistant", content: "Заявка отправлена. Менеджер свяжется с вами по указанному номеру." }]);
    } catch {
      setLeadState("error");
    }
  }

  function resetChat() {
    setMessages([initial]);
    setMessage("");
    setWizardStep(null);
    setWizard({ purpose: "", location: "", volume: "", water_source: "" });
    setSalesContext({});
    setLeadOpen(false);
    setLeadProductSlug(undefined);
    setLeadState("idle");
    setLead({ name: "", phone: "", message: "" });
  }

  function startWizard() {
    setWizardStep(0);
    setMessages([
      ...messages,
      { role: "assistant", content: "Подберём оборудование. Для чего нужен автомат?" },
    ]);
  }

  async function wizardSelect(value: string) {
    const fields = ["purpose", "location", "volume", "water_source"] as const;
    const labels = [
      "Для чего нужен автомат?",
      "Где будет установлен автомат?",
      "Какой нужен объём?",
      "Какой источник воды?",
    ];
    const nextWizard = { ...wizard, [fields[wizardStep ?? 0]]: value };
    setWizard(nextWizard);
    setSalesContext(nextWizard);

    const nextStep = (wizardStep ?? 0) + 1;
    if (nextStep < fields.length) {
      setWizardStep(nextStep);
      setMessages((prev) => [...prev, { role: "user", content: value }, { role: "assistant", content: labels[nextStep] }]);
      return;
    }

    setWizardStep(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: value }, { role: "assistant", content: "Подбираю оборудование..." }]);

    try {
      const response = await apiFetch(`${API_URL}/api/v1/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextWizard),
      });
      if (!response.ok) throw new Error("Recommendation failed");
      const data = await response.json();
      const p = data.product;
      if (!p || !p.model) throw new Error("No product");
      setLeadProductSlug(p.slug);
      const price = p.price == null ? "По запросу" : `${p.price} ${p.currency}`;
      const specs = Object.entries(p.specifications || {}).slice(0, 4).map(([k, v]) => `${k}: ${v}`).join("\n");
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: `Рекомендую рассмотреть ${p.name} (${p.model}).\n\n${data.explanation}\n\n${specs}\nЦена: ${price}\nНаличие: ${p.availability}`,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Не удалось выполнить подбор. Оставьте заявку менеджеру." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const wizardOptions = [
    [
      ["Для продажи воды", "Продажа воды"],
      ["Для бизнеса/объекта", "Бизнес или объект"],
      ["Пока не знаю", "Пока не знаю"],
    ],
    [
      ["Магазин", "Магазин"],
      ["Жилой комплекс", "Жилой комплекс"],
      ["Производство", "Производство"],
      ["Другое", "Другое"],
    ],
    [
      ["До 500 л/сутки", "До 500 л/сутки"],
      ["500–1000 л/сутки", "500–1000 л/сутки"],
      ["Более 1000 л/сутки", "Более 1000 л/сутки"],
      ["Не знаю", "Не знаю"],
    ],
    [
      ["Водопровод", "Водопровод"],
      ["Скважина", "Скважина"],
      ["Не знаю", "Не знаю"],
    ],
  ];

  return (
    <>
      {open && (
        <section className="ai-chat-window" aria-label="AI-консультант">
          <div className="ai-chat-header">
            <div>
              <strong>AI-консультант</strong>
              <small>VendAI · онлайн</small>
            </div>
            <div className="ai-chat-header-actions">
              <button type="button" onClick={resetChat} aria-label="Начать заново">↻</button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button>
            </div>
          </div>

          <div className="ai-chat-messages">
            {messages.map((item, index) => (
              <div
                className={`ai-message ai-${item.role} ${streaming && index === messages.length - 1 ? "ai-streaming" : ""}`}
                key={index}
              >
                {item.content}
              </div>
            ))}
            {messages.length === 1 && !loading && (
              <div className="ai-quick-actions">
                {quickActions.map(([label, prompt]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => label === "Подобрать аппарат" ? startWizard() : submitText(prompt)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {wizardStep !== null && !loading && (
              <div className="ai-quick-actions">
                {wizardOptions[wizardStep].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => wizardSelect(value)}>{label}</button>
                ))}
              </div>
            )}
            {wizardStep === null && leadProductSlug && !loading && !leadOpen && (
              <div className="ai-quick-actions">
                <button type="button" onClick={() => setLeadOpen(true)}>Получить предложение по этой модели</button>
              </div>
            )}
            {loading && !streaming && <div className="ai-message ai-assistant">Подбираю ответ...</div>}
            <div ref={bottomRef} />
          </div>

          <form className="ai-chat-form" onSubmit={submit}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Напишите вопрос..."
              disabled={loading}
            />
            <button className="button button-primary" type="submit" disabled={loading || !message.trim()}>
              →
            </button>
          </form>

          {!leadOpen ? (
            <button type="button" className="ai-chat-lead ai-chat-lead-button" onClick={() => setLeadOpen(true)}>
              Получить предложение менеджера →
            </button>
          ) : (
            <form className="ai-lead-form" onSubmit={submitLead}>
              <strong>Получить предложение{leadProductSlug ? " по выбранной модели" : ""}</strong>
              <input required placeholder="Ваше имя" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} />
              <input required type="tel" placeholder="Телефон" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} />
              <textarea placeholder="Что вас интересует?" rows={2} value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} />
              <button className="button button-primary" type="submit" disabled={leadState === "sending"}>
                {leadState === "sending" ? "Отправка..." : "Отправить заявку"}
              </button>
              {leadState === "success" && <small className="form-success">Заявка отправлена.</small>}
              {leadState === "error" && <small className="form-error">Не удалось отправить заявку.</small>}
            </form>
          )}
        </section>
      )}

      <button
        className="chat-button"
        aria-label="Открыть AI-консультанта"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>AI</span>
        <div><strong>AI-консультант</strong><small>Поможем выбрать аппарат</small></div>
      </button>
    </>
  );
}
