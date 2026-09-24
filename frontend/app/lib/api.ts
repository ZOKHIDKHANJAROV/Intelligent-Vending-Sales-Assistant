export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

// Бесплатный ngrok отдаёт HTML-страницу с предупреждением вместо ответа API,
// если в запросе нет этого заголовка
const NGROK = /\.ngrok(-free)?\.(app|dev|io)$/.test(new URL(API_URL).hostname);

export function apiFetch(url: string, init: RequestInit = {}) {
  if (!NGROK) return fetch(url, init);
  const headers = new Headers(init.headers);
  headers.set("ngrok-skip-browser-warning", "1");
  return fetch(url, { ...init, headers });
}
