"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const initial: Message = {
  role: "assistant",
  content: "Здравствуйте. Я AI-консультант VendAI. Помогу подобрать аппарат, расскажу о характеристиках и помогу оставить заявку.",
};

const quickActions = [
  ["Подобрать аппарат", "Хочу подобрать аппарат для бизнеса."],
  ["Характеристики XL-01", "Расскажите характеристики XL-01."],
  ["Сколько стоит?", "Сколько стоит аппарат?"],
  ["Как выбрать?", "Какой аппарат мне выбрать?"],
];

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([initial]);
  const [loading, setLoading] = useState(false);
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

    try {
      const response = await fetch(`${API_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: messages.slice(-8),
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");
      const data = await response.json();

      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Не удалось связаться с AI-консультантом. Оставьте заявку, и менеджер свяжется с вами.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submitText(message);
  }

  function resetChat() {
    setMessages([initial]);
    setMessage("");
  }

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
              <div className={`ai-message ai-${item.role}`} key={index}>
                {item.content}
              </div>
            ))}
            {messages.length === 1 && !loading && (
              <div className="ai-quick-actions">
                {quickActions.map(([label, prompt]) => (
                  <button key={label} type="button" onClick={() => submitText(prompt)}>{label}</button>
                ))}
              </div>
            )}
            {loading && <div className="ai-message ai-assistant">Подбираю ответ...</div>}
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

          <a className="ai-chat-lead" href="/#contacts" onClick={() => setOpen(false)}>
            Нужна цена или коммерческое предложение? Оставить заявку →
          </a>
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
