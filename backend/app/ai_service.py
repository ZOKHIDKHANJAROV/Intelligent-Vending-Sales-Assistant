import json
import logging
import os
from collections.abc import AsyncIterator
from typing import Any
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Product
from .qdrant_service import search_documents

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
# На CPU без GPU ответ 7B-модели занимает 1–2 минуты
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "240"))
OLLAMA_NUM_PREDICT = int(os.getenv("OLLAMA_NUM_PREDICT", "450"))
HISTORY_MESSAGES = 4
HISTORY_MESSAGE_CHARS = 400

SYSTEM_PROMPT = """Ты — AI-консультант отдела продаж VendAI.
Твоя задача — понять потребность клиента, подобрать подходящее оборудование и довести диалог до заявки менеджеру.

Правила:
1. Отвечай на русском.
2. Используй только факты из ДАННЫЕ О ТОВАРАХ и БАЗА ЗНАНИЙ.
3. Не выдумывай цену, наличие, характеристики, сроки поставки, гарантию или условия.
4. Если нужного факта нет в источниках, скажи: «Уточню у менеджера».
5. Веди диалог как продавец: сначала пойми задачу клиента, затем предложи модель.
6. Если не хватает данных для подбора, задай ОДИН следующий простой вопрос. Не задавай сразу четыре вопроса.
7. Для подбора обычно нужны: назначение, место установки, примерный объём и источник воды.
8. Если клиент уже сообщил параметр, не спрашивай его повторно.
9. Не перегружай техническими деталями. Давай короткий практический ответ.
10. Если есть подходящая модель в каталоге, называй её и объясняй соответствие конкретной потребности.
11. Когда клиент проявляет интерес к покупке, предложи получить предложение менеджера.
12. Не утверждай, что модель точно подходит для объекта без проверки менеджером, если исходных данных недостаточно.
13. Если клиент спрашивает, как связаться, или хочет поговорить с человеком, дай контакт менеджера.

КОНТАКТ МЕНЕДЖЕРА: Зохид, телефон +998 93 186 08 10.
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

    blocks = []
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

def _sales_context(context: dict[str, str] | None) -> str:
    if not context:
        return "Параметры клиента пока не собраны."
    labels = {
        "purpose": "Назначение",
        "location": "Место установки",
        "volume": "Ожидаемый объём",
        "water_source": "Источник воды",
    }
    rows = [
        f"- {labels[key]}: {value}"
        for key, value in context.items()
        if key in labels and value
    ]
    return "\n".join(rows) if rows else "Параметры клиента пока не собраны."

UNAVAILABLE_ANSWER = "AI-консультант временно недоступен. Оставьте заявку, и менеджер свяжется с вами."
EMPTY_ANSWER = "Не удалось сформировать ответ. Оставьте заявку, и менеджер свяжется с вами."


async def build_messages(
    db: Session,
    message: str,
    history: list[dict[str, str]] | None = None,
    sales_context: dict[str, str] | None = None,
) -> list[dict[str, str]]:
    try:
        results = await search_documents(message, limit=4)
        knowledge_context = "\n\n---\n\n".join(
            f"[{item['title']}]\n{item['text']}"
            for item in results
            if item["text"]
        )
    except Exception:
        knowledge_context = ""

    if not knowledge_context:
        knowledge_context = "Релевантных документов в базе знаний не найдено."

    system = (
        SYSTEM_PROMPT
        + "\n\nТЕКУЩИЕ ПАРАМЕТРЫ КЛИЕНТА:\n"
        + _sales_context(sales_context)
        + "\n\nДАННЫЕ О ТОВАРАХ:\n"
        + _product_context(db)
        + "\n\nБАЗА ЗНАНИЙ:\n"
        + knowledge_context
    )

    messages = [{"role": "system", "content": system}]
    if history:
        # На CPU каждый токен истории заметно задерживает начало ответа,
        # поэтому берём только последние реплики и обрезаем длинные ответы
        messages.extend(
            {"role": item["role"], "content": item["content"][:HISTORY_MESSAGE_CHARS]}
            for item in history[-HISTORY_MESSAGES:]
            if item.get("role") in {"user", "assistant"} and item.get("content")
        )
    messages.append({"role": "user", "content": message})
    return messages


def _ollama_payload(messages: list[dict[str, str]], stream: bool) -> dict[str, Any]:
    return {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": stream,
        "options": {"temperature": 0.2, "num_predict": OLLAMA_NUM_PREDICT},
        "keep_alive": "30m",
    }


async def generate_answer(
    db: Session,
    message: str,
    history: list[dict[str, str]] | None = None,
    sales_context: dict[str, str] | None = None,
) -> dict[str, Any]:
    messages = await build_messages(db, message, history, sales_context)

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=_ollama_payload(messages, stream=False))
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        return {
            "answer": UNAVAILABLE_ANSWER,
            "model": OLLAMA_MODEL,
            "error": str(exc) or type(exc).__name__,
        }

    return {
        "answer": data.get("message", {}).get("content", "").strip() or EMPTY_ANSWER,
        "model": OLLAMA_MODEL,
        "error": None,
    }


async def stream_answer(messages: list[dict[str, str]]) -> AsyncIterator[str]:
    """Отдаёт ответ модели по кусочкам по мере генерации."""
    produced = False
    try:
        # Таймаут на чтение — между соседними кусками ответа, а не на весь ответ
        async with httpx.AsyncClient(timeout=httpx.Timeout(OLLAMA_TIMEOUT, connect=10)) as client:
            async with client.stream(
                "POST", f"{OLLAMA_BASE_URL}/api/chat", json=_ollama_payload(messages, stream=True)
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    if chunk.get("error"):
                        raise RuntimeError(chunk["error"])
                    text = chunk.get("message", {}).get("content", "")
                    if not produced:
                        text = text.lstrip()
                    if text:
                        produced = True
                        yield text
                    if chunk.get("done"):
                        break
    except (httpx.HTTPError, RuntimeError, json.JSONDecodeError) as exc:
        logger.warning("Ollama stream failed: %s", str(exc) or type(exc).__name__)
        yield ("\n\n" if produced else "") + UNAVAILABLE_ANSWER
        return

    if not produced:
        yield EMPTY_ANSWER
