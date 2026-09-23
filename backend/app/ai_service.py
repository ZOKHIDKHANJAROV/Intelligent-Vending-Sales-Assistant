import os
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Product

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

SYSTEM_PROMPT = """Ты — AI-консультант компании VendAI по продаже вендингового оборудования.

Правила:
1. Отвечай на русском языке.
2. Используй только информацию из блока ДАННЫЕ О ТОВАРАХ.
3. Не выдумывай цены, наличие, характеристики, сроки поставки, гарантию или условия, которых нет в данных.
4. Если информации нет, прямо скажи: "Уточню у менеджера" и предложи оставить заявку.
5. Если покупатель выбирает аппарат, сначала уточни задачу: что продают, место установки, требуемая производительность и бюджет, если это необходимо.
6. Не утверждай медицинские или санитарные свойства воды, если они прямо не указаны в данных.
7. Отвечай кратко и по делу.
8. Когда уместно, называй модель товара.
"""

def _product_context(db: Session) -> str:
    products = list(
        db.scalars(
            select(Product)
            .where(Product.is_active.is_(True))
            .order_by(Product.id.desc())
        ).all()
    )

    if not products:
        return "Активных товаров в каталоге нет."

    blocks: list[str] = []
    for p in products:
        specs = "\n".join(f"- {k}: {v}" for k, v in (p.specifications or {}).items())
        advantages = "\n".join(f"- {x}" for x in (p.advantages or []))
        price = "По запросу" if p.price is None else f"{p.price} {p.currency}"
        blocks.append(
            f"""ТОВАР: {p.name}
Модель: {p.model}
Категория: {p.category}
Описание: {p.description}
Цена: {price}
Наличие: {p.availability}
Гарантия: {p.warranty_months} месяцев
Характеристики:
{specs}
Преимущества:
{advantages}"""
        )

    return "\n\n---\n\n".join(blocks)

async def generate_answer(
    db: Session,
    message: str,
    history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    context = _product_context(db)

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT + "\n\nДАННЫЕ О ТОВАРАХ:\n" + context,
        }
    ]

    if history:
        for item in history[-8:]:
            role = item.get("role")
            content = item.get("content", "")
            if role in {"user", "assistant"} and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.2,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        return {
            "answer": "AI-консультант временно недоступен. Оставьте заявку, и менеджер свяжется с вами.",
            "model": OLLAMA_MODEL,
            "error": str(exc),
        }

    answer = (
        data.get("message", {}).get("content", "").strip()
        or "Не удалось сформировать ответ. Оставьте заявку, и менеджер свяжется с вами."
    )

    return {
        "answer": answer,
        "model": OLLAMA_MODEL,
        "error": None,
    }
