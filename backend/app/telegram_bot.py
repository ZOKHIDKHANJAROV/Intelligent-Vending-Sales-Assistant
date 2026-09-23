import asyncio
import logging
import os
from collections import defaultdict

import httpx
from aiogram import Bot, Dispatcher, F
from aiogram.filters import Command, CommandStart
from aiogram.types import KeyboardButton, Message, ReplyKeyboardMarkup

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000").rstrip("/")

if not TELEGRAM_BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")

dp = Dispatcher()
http = httpx.AsyncClient(timeout=90)

histories: dict[int, list[dict[str, str]]] = defaultdict(list)
lead_sessions: set[int] = set()
wizard_sessions: dict[int, dict[str, str]] = {}


def main_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Подобрать аппарат"), KeyboardButton(text="Оборудование")],
            [KeyboardButton(text="Характеристики"), KeyboardButton(text="Цена")],
            [KeyboardButton(text="Связаться с менеджером"), KeyboardButton(text="Начать заново")],
        ],
        resize_keyboard=True,
        input_field_placeholder="Выберите действие или напишите вопрос",
    )


def cancel_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="Отмена")]],
        resize_keyboard=True,
    )


def options_keyboard(options: list[str]) -> ReplyKeyboardMarkup:
    rows = [[KeyboardButton(text=option)] for option in options]
    rows.append([KeyboardButton(text="Отмена")])
    return ReplyKeyboardMarkup(
        keyboard=rows,
        resize_keyboard=True,
        input_field_placeholder="Выберите вариант",
    )


def welcome() -> str:
    return (
        "Здравствуйте. Я AI-консультант VendAI.\n\n"
        "Помогу подобрать вендинговый аппарат, рассказать о характеристиках "
        "и принять заявку менеджеру.\n\n"
        "Выберите действие ниже или просто напишите вопрос."
    )


def start_wizard(message: Message) -> None:
    wizard_sessions[message.from_user.id] = {"step": "purpose"}


async def show_wizard_step(message: Message) -> None:
    session = wizard_sessions.get(message.from_user.id)
    if not session:
        start_wizard(message)
        session = wizard_sessions[message.from_user.id]

    step = session["step"]

    if step == "purpose":
        await message.answer(
            "Шаг 1 из 4. Для чего нужен аппарат?",
            reply_markup=options_keyboard([
                "Для продажи воды",
                "Для бизнеса/объекта",
                "Пока не знаю",
            ]),
        )
    elif step == "location":
        await message.answer(
            "Шаг 2 из 4. Где планируете установить аппарат?",
            reply_markup=options_keyboard([
                "Магазин",
                "Жилой комплекс",
                "Производство",
                "Другое",
            ]),
        )
    elif step == "volume":
        await message.answer(
            "Шаг 3 из 4. Какой ориентировочный объём воды нужен?",
            reply_markup=options_keyboard([
                "До 500 л/сутки",
                "500–1000 л/сутки",
                "Более 1000 л/сутки",
                "Не знаю",
            ]),
        )
    elif step == "water_source":
        await message.answer(
            "Шаг 4 из 4. Какой источник воды?",
            reply_markup=options_keyboard([
                "Водопровод",
                "Скважина",
                "Не знаю",
            ]),
        )


async def run_recommendation(message: Message) -> None:
    user_id = message.from_user.id
    session = wizard_sessions.get(user_id)

    if not session:
        await message.answer("Начните подбор заново.", reply_markup=main_keyboard())
        return

    try:
        response = await http.post(
            f"{BACKEND_URL}/api/v1/recommendations",
            json={
                "purpose": session["purpose"],
                "location": session["location"],
                "volume": session["volume"],
                "water_source": session["water_source"],
            },
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError:
        wizard_sessions.pop(user_id, None)
        await message.answer(
            "Не удалось подобрать аппарат автоматически. "
            "Оставьте заявку менеджеру, и он поможет с выбором.",
            reply_markup=main_keyboard(),
        )
        return

    product = data.get("product") or {}
    if not product:
        wizard_sessions.pop(user_id, None)
        await message.answer(
            data.get("explanation", "Сейчас нет доступных моделей."),
            reply_markup=main_keyboard(),
        )
        return

    session["product_slug"] = product.get("slug", "")

    price = product.get("price")
    if price is None:
        price_text = "По запросу"
    else:
        currency = product.get("currency", "UZS")
        price_text = f"{price:,.0f} {currency}".replace(",", " ")

    specifications = product.get("specifications") or {}
    performance = specifications.get("Производительность", "см. характеристики")
    availability = product.get("availability") or "Уточняется"

    await message.answer(
        "Рекомендация по вашим параметрам:\n\n"
        f"Модель: {product.get('model', product.get('name', 'аппарат'))}\n"
        f"Производительность: {performance}\n"
        f"Цена: {price_text}\n"
        f"Наличие: {availability}\n\n"
        f"{data.get('explanation', '')}",
        reply_markup=ReplyKeyboardMarkup(
            keyboard=[
                [KeyboardButton(text="Получить предложение")],
                [KeyboardButton(text="Начать подбор заново")],
                [KeyboardButton(text="В главное меню")],
            ],
            resize_keyboard=True,
        ),
    )


async def begin_lead(message: Message, product_slug: str | None = None) -> None:
    user_id = message.from_user.id
    lead_sessions.add(user_id)

    if product_slug:
        wizard_sessions[user_id] = {
            **wizard_sessions.get(user_id, {}),
            "product_slug": product_slug,
        }

    await message.answer(
        "Оставьте заявку в одном сообщении:\n\n"
        "Имя, телефон, ваш вопрос\n\n"
        "Например: Азиз, +998901234567, интересует XL-01.",
        reply_markup=cancel_keyboard(),
    )


async def create_lead(message: Message, text: str):
    user_id = message.from_user.id
    parts = [part.strip() for part in text.split(",", 2)]

    if len(parts) < 2:
        await message.answer("Нужно указать хотя бы имя и телефон через запятую.")
        return

    name = parts[0]
    phone = parts[1]
    question = parts[2] if len(parts) == 3 else "Заявка из Telegram"
    session = wizard_sessions.get(user_id, {})
    product_slug = session.get("product_slug")
    collected = [
        f"{label}: {session[key]}"
        for key, label in (
            ("purpose", "Назначение"),
            ("location", "Место"),
            ("volume", "Объём"),
            ("water_source", "Источник воды"),
        )
        if session.get(key)
    ]
    if collected:
        question = question + "\\n\\nПараметры подбора: " + "; ".join(collected)

    try:
        response = await http.post(
            f"{BACKEND_URL}/api/v1/leads",
            json={
                "name": name,
                "phone": phone,
                "message": question,
                "product_slug": product_slug,
                "source": "telegram",
            },
        )
        response.raise_for_status()
    except httpx.HTTPError:
        await message.answer(
            "Не удалось отправить заявку. Попробуйте позже или напишите менеджеру.",
            reply_markup=main_keyboard(),
        )
        return

    lead_sessions.discard(user_id)
    wizard_sessions.pop(user_id, None)

    await message.answer(
        "Заявка принята. Менеджер свяжется с вами по указанному номеру.",
        reply_markup=main_keyboard(),
    )


@dp.message(CommandStart())
async def start(message: Message):
    user_id = message.from_user.id
    histories[user_id].clear()
    lead_sessions.discard(user_id)
    wizard_sessions.pop(user_id, None)
    await message.answer(welcome(), reply_markup=main_keyboard())


@dp.message(Command("help"))
async def help_command(message: Message):
    await message.answer(
        "Выберите нужное действие на клавиатуре ниже или задайте вопрос обычным сообщением.",
        reply_markup=main_keyboard(),
    )


@dp.message(Command("contact"))
async def contact_command(message: Message):
    await begin_lead(message)


@dp.message(F.text)
async def chat(message: Message):
    user_id = message.from_user.id
    text = message.text.strip()

    if user_id in lead_sessions:
        if text == "Отмена":
            lead_sessions.discard(user_id)
            await message.answer("Заявка отменена.", reply_markup=main_keyboard())
            return
        await create_lead(message, text)
        return

    if text == "Подобрать аппарат":
        start_wizard(message)
        await show_wizard_step(message)
        return

    if user_id in wizard_sessions:
        session = wizard_sessions[user_id]
        step = session["step"]

        if text in {"Отмена", "В главное меню"}:
            wizard_sessions.pop(user_id, None)
            await message.answer("Подбор отменён.", reply_markup=main_keyboard())
            return

        if text == "Начать подбор заново":
            start_wizard(message)
            await show_wizard_step(message)
            return

        if step == "purpose":
            session["purpose"] = text
            session["step"] = "location"
            await show_wizard_step(message)
            return

        if step == "location":
            session["location"] = text
            session["step"] = "volume"
            await show_wizard_step(message)
            return

        if step == "volume":
            session["volume"] = text
            session["step"] = "water_source"
            await show_wizard_step(message)
            return

        if step == "water_source":
            session["water_source"] = text
            session["step"] = "result"
            await message.answer("Подбираю аппарат по вашим параметрам...")
            await run_recommendation(message)
            return

        if step == "result":
            if text == "Получить предложение":
                await begin_lead(message, session.get("product_slug"))
                return

    if text == "Оборудование":
        text = "Какие аппараты доступны?"
    elif text == "Характеристики":
        text = "Расскажите характеристики XL-01."
    elif text == "Цена":
        text = "Сколько стоит аппарат?"
    elif text == "Связаться с менеджером":
        await begin_lead(message)
        return
    elif text == "Начать заново":
        histories[user_id].clear()
        wizard_sessions.pop(user_id, None)
        await message.answer(welcome(), reply_markup=main_keyboard())
        return

    history = histories[user_id][-8:]

    try:
        response = await http.post(
            f"{BACKEND_URL}/api/v1/chat",
            json={
                "message": text,
                "history": history,
                "sales_context": {k: v for k, v in wizard_sessions.get(user_id, {}).items() if k in {"purpose", "location", "volume", "water_source"}},
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

    await message.answer(answer, reply_markup=main_keyboard())


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
