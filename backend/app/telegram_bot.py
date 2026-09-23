import asyncio
import logging
import os
from collections import defaultdict

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import Message

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000").rstrip("/")

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")

dp = Dispatcher()
http = httpx.AsyncClient(timeout=90)
histories: dict[int, list[dict[str, str]]] = defaultdict(list)
lead_sessions: set[int] = set()


def welcome() -> str:
    return (
        "Здравствуйте. Я AI-консультант VendAI.\n\n"
        "Помогу подобрать вендинговый аппарат, рассказать о характеристиках "
        "и принять заявку менеджеру.\n\n"
        "Просто напишите свой вопрос."
    )


@dp.message(CommandStart())
async def start(message: Message):
    histories[message.from_user.id].clear()
    lead_sessions.discard(message.from_user.id)
    await message.answer(welcome())


@dp.message(Command("help"))
async def help_command(message: Message):
    await message.answer(
        "Доступные команды:\n"
        "/start — начать диалог\n"
        "/contact — оставить заявку менеджеру\n"
        "/help — помощь"
    )


@dp.message(Command("contact"))
async def contact_command(message: Message):
    lead_sessions.add(message.from_user.id)
    await message.answer(
        "Оставьте данные одним сообщением в формате:\n"
        "Имя, телефон, ваш вопрос\n\n"
        "Например: Азиз, +998901234567, интересует XL-01."
    )


async def create_lead(message: Message, text: str):
    parts = [part.strip() for part in text.split(",", 2)]
    if len(parts) < 2:
        await message.answer("Нужно указать хотя бы имя и телефон через запятую.")
        return

    name = parts[0]
    phone = parts[1]
    question = parts[2] if len(parts) == 3 else "Заявка из Telegram"

    try:
        response = await http.post(
            f"{BACKEND_URL}/api/v1/leads",
            json={
                "name": name,
                "phone": phone,
                "message": question,
                "source": "telegram",
            },
        )
        response.raise_for_status()
    except httpx.HTTPError:
        await message.answer(
            "Не удалось отправить заявку. Попробуйте позже или напишите менеджеру."
        )
        return

    lead_sessions.discard(message.from_user.id)
    await message.answer(
        "Заявка принята. Менеджер свяжется с вами по указанному номеру."
    )


@dp.message(F.text)
async def chat(message: Message):
    user_id = message.from_user.id
    text = message.text.strip()

    if user_id in lead_sessions:
        await create_lead(message, text)
        return

    history = histories[user_id][-8:]

    try:
        response = await http.post(
            f"{BACKEND_URL}/api/v1/chat",
            json={
                "message": text,
                "history": history,
            },
        )
        response.raise_for_status()
        data = response.json()
        answer = data.get("answer") or (
            "AI-консультант временно недоступен. "
            "Используйте /contact, чтобы оставить заявку."
        )
    except httpx.HTTPError:
        answer = (
            "AI-консультант временно недоступен. "
            "Попробуйте ещё раз или используйте /contact."
        )

    history.append({"role": "user", "content": text})
    history.append({"role": "assistant", "content": answer})
    histories[user_id] = history[-8:]

    await message.answer(answer)


async def main():
    logging.basicConfig(level=logging.INFO)
    bot = Bot(token=TELEGRAM_BOT_TOKEN)
    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await http.aclose()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
