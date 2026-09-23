# VendAI — Intelligent Vending Sales Assistant

Commercial website and AI sales assistant for vending machine customers.

## MVP stack

- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Database: PostgreSQL
- Vector DB: Qdrant
- Cache: Redis
- Local LLM: Ollama
- Deployment: Docker Compose
- Public access: Cloudflare Tunnel

## Current functionality

- Landing page
- Database-backed product catalog
- Product detail pages
- Search and category filtering
- Admin CRUD for products
- Protected admin API with `X-Admin-Key`
- PostgreSQL seed data for XL-01
- Customer lead capture and lead management
- Admin lead statuses: new / contacted / closed

## Admin

1. Copy `.env.example` to `.env`.
2. Set a long random `ADMIN_API_KEY`.
3. Start the stack.
4. Open `/admin`.
5. Enter the same key.

The admin key is stored only in the browser local storage for the current admin session. Do not use the example key in production.

## Product API

Public:

- `GET /api/v1/products`
- `GET /api/v1/products/{slug}`
- `GET /api/v1/products/categories/list`

Protected:

- `GET /api/v1/admin/products`
- `POST /api/v1/admin/products`
- `PUT /api/v1/admin/products/{id}`
- `DELETE /api/v1/admin/products/{id}`

Leads:

- `POST /api/v1/leads`
- `GET /api/v1/leads/admin`
- `PATCH /api/v1/leads/{id}/status?status=new|contacted|closed`

Protected requests require:

`X-Admin-Key: <ADMIN_API_KEY>`

## Architecture

Website -> FastAPI -> PostgreSQL / Qdrant / Redis / Ollama

The AI assistant will use RAG for company documents and structured product data from PostgreSQL.

## AI Assistant

The website includes an AI sales consultant backed by Ollama.

Chat endpoint:

- `POST /api/v1/chat`

Request:

```json
{
  "message": "Какая производительность у XL-01?",
  "history": []
}
```

The assistant receives active products directly from PostgreSQL and is instructed not to invent prices, availability, specifications, delivery terms, or warranty conditions.

### Start Ollama

After starting Docker Compose, pull the configured model inside the Ollama container:

```bash
docker compose exec ollama ollama pull llama3.2:3b
```

Then open the website and use the AI button in the lower-right corner.

For a stronger local model, change `OLLAMA_MODEL` in `.env` and pull that model into the Ollama container.
