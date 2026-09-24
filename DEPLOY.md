# Публикация: сайт на Render, сервер на своём ПК

```
Посетитель ──► https://vendai-frontend.onrender.com   (Render, Next.js)
                     │  запросы к API
                     ▼
               https://xxx.ngrok-free.app              (ngrok, постоянный домен)
                     │  туннель
                     ▼
               Ваш ПК: backend :8000 ── Postgres, Qdrant, Ollama
```

Сайт открывается всегда. Каталог, чат с ИИ и заявки работают, только пока ваш ПК включён
и на нём запущены Docker и ngrok.

## 1. ngrok (один раз)

1. Зарегистрируйтесь на <https://dashboard.ngrok.com/signup>, это бесплатно.
2. Скопируйте токен: <https://dashboard.ngrok.com/get-started/your-authtoken>.
3. Получите бесплатный постоянный домен: <https://dashboard.ngrok.com/domains> → **Create Domain**.
   Получится адрес вида `something-something.ngrok-free.app`.
4. Впишите оба значения в `.env` в корне проекта:

   ```env
   NGROK_AUTHTOKEN=ваш_токен
   NGROK_DOMAIN=something-something.ngrok-free.app
   ```

## 2. Запуск сервера на ПК

```bash
docker compose --profile public up -d
```

Проверка: откройте в браузере `https://<NGROK_DOMAIN>/health`, должен прийти ответ `{"status":"ok",...}`.
Бесплатный ngrok при открытии адреса в браузере сначала покажет страницу-предупреждение, это нормально.
Сайт запрашивает API со специальным заголовком, и ему это предупреждение не мешает.

Без `--profile public` проект запускается как раньше, только локально.

## 3. Сайт на Render (один раз)

1. Код должен быть на GitHub в той ветке, из которой будет собираться Render (обычно `main`).
2. <https://dashboard.render.com> → **New** → **Blueprint** → выберите репозиторий.
   Render прочитает `render.yaml` и создаст сервис `vendai-frontend`.
3. На вопрос о переменной `NEXT_PUBLIC_API_URL` введите `https://<NGROK_DOMAIN>` (без `/` в конце).
4. Дождитесь сборки. Сайт появится по адресу `https://vendai-frontend.onrender.com`
   (точный адрес показан в панели Render).

`NEXT_PUBLIC_API_URL` вшивается в сайт при сборке. Если вы поменяете домен ngrok, измените переменную
в Render и запустите **Manual Deploy → Clear build cache & deploy**.

## 4. Закрыть API для чужих сайтов

Когда сайт на Render заработает, пропишите его адрес в `.env` и перезапустите бэкенд:

```env
CORS_ORIGINS=https://vendai-frontend.onrender.com,http://localhost:3000
```

```bash
docker compose --profile public up -d backend
```

## Что учесть

- **ПК должен работать.** Отключите сон в настройках питания Windows и включите автозапуск Docker Desktop.
  Контейнеры и ngrok перезапускаются сами (`restart: unless-stopped`).
- **Бесплатный Render засыпает** после 15 минут без посетителей. Первое открытие после этого занимает ~30–60 с.
- **Админка** (`/admin`) доступна из интернета и защищена только `ADMIN_API_KEY` из `.env`.
  Ключ должен быть длинным и случайным и не совпадать с `.env.example`.
- **ИИ на CPU** начинает отвечать через 30–80 с. Запросы нескольких посетителей выстраиваются в очередь.
