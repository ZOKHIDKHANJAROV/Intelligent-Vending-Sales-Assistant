# VendAI — Intelligent Vending Sales Assistant

Commercial website and AI sales assistant for vending machine customers.

## MVP stack

- Frontend: Next.js + TypeScript + Tailwind CSS
- Backend: FastAPI + Python
- Database: PostgreSQL
- Vector DB: Qdrant
- Cache: Redis
- Local LLM: Ollama
- Deployment: Docker Compose
- Public access: Cloudflare Tunnel

## Architecture

Website -> FastAPI -> PostgreSQL / Qdrant / Redis / Ollama

The AI assistant uses RAG for company documents and structured product data from PostgreSQL.

## Project status

Initial project skeleton.
