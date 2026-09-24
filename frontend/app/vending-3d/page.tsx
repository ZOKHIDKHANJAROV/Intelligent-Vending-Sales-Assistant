"use client";

import React, { useState } from "react";
import VendingMachine3D from "../components/VendingMachine3D";
import LeadForm from "../components/LeadForm";
import AIChat from "../components/AIChat";

export default function Vending3DPage() {
  // Profitability calculator state
  const [litersPerDay, setLitersPerDay] = useState<number>(450);
  const [pricePerLiter, setPricePerLiter] = useState<number>(500); // 500 UZS / liter
  const [costPerLiter, setCostPerLiter] = useState<number>(60); // 60 UZS / liter raw cost

  // Calculations
  const monthlyRevenue = litersPerDay * pricePerLiter * 30;
  const monthlyCost = litersPerDay * costPerLiter * 30 + 350000; // consumables + electricity
  const monthlyProfit = monthlyRevenue - monthlyCost;

  // Filtration stages data
  const filtrationStages = [
    {
      step: "01",
      name: "Кварцевый песок",
      role: "Грубая механическая очистка",
      desc: "Задерживает крупные механические примеси, взвеси, ил, песок и частицы ржавчины размером более 20 мкм. Продлевает ресурс последующих фильтров.",
      icon: "🏖️",
      tag: "Механика",
    },
    {
      step: "02",
      name: "Активированный уголь",
      role: "Сорбционная фильтрация",
      desc: "Эффективно поглощает остаточный хлор, хлорорганические соединения, устраняет посторонние запахи, привкусы и мутность исходной воды.",
      icon: "⬛",
      tag: "Сорбция",
    },
    {
      step: "03",
      name: "Картридж UDF",
      role: "Гранулированный активированный уголь",
      desc: "Глубокая очистка воды от химических загрязнителей, пестицидов, бензола и фенолов высокой адсорбционной емкостью кокосового угля.",
      icon: "🧪",
      tag: "Адсорбция",
    },
    {
      step: "04",
      name: "Картридж CTO",
      role: "Прессованный активированный уголь",
      desc: "Угольный карбон-блок тонкой фильтрации. Удаляет мельчайшие частицы угольной пыли и органические следовые загрязнения.",
      icon: "🧱",
      tag: "Карбон-блок",
    },
    {
      step: "05",
      name: "Картридж PP (5 мкм)",
      role: "Тонкая механическая полипропиленовая очистка",
      desc: "Полипропиленовый микрофильтр задерживает взвешенные частицы размером от 5 микрон. Служит ключевым защитным барьером перед осмотической мембраной.",
      icon: "🛡️",
      tag: "Предмембрана",
    },
    {
      step: "06",
      name: "Мембрана Vontron LP-4040",
      role: "Промышленный обратный осмос (Селективность 99%)",
      desc: "Сердце системы. Пропускает исключительно молекулы воды, задерживая до 99% солей жесткости, нитратов, вирусов, бактерий и тяжелых металлов.",
      icon: "🌀",
      tag: "Обратный осмос",
    },
    {
      step: "07",
      name: "УФ-стерилизатор",
      role: "Ультрафиолетовое обеззараживание",
      desc: "Проточное облучение бактерицидной УФ-лампой в корпусе из нержавеющей стали. Мгновенно разрушает ДНК бактерий и микроорганизмов без химикатов.",
      icon: "🟣",
      tag: "Бактерицидный",
    },
    {
      step: "08",
      name: "Минерализаторы",
      role: "Обогащение микроэлементами",
      desc: "Восстанавливает оптимальный минерально-солевой баланс питьевой воды: обогащает кальцием (Ca), магнием (Mg), калием (K) и нормализует уровень pH.",
      icon: "💎",
      tag: "Минерализация",
    },
    {
      step: "09",
      name: "Озонатор",
      role: "Озонирование и финальная стерилизация",
      desc: "Насыщает воду активным кислородом, предотвращает развитие водорослей и бактериальной пленки в емкости, придает воде родниковую свежесть.",
      icon: "⚡",
      tag: "Озонирование",
    },
  ];

  // Technical specifications
  const specs = [
    { label: "Модель", value: "XL-01 (Atlant Fortuna)" },
    { label: "Производительность", value: "0,25 м³/ч (250 л/час)" },
    { label: "Давление — предочистка", value: "0,1 – 0,4 МПа" },
    { label: "Давление — обратный осмос", value: "0,4 – 1,0 МПа" },
    { label: "Напряжение питания", value: "220 В / 50 Гц (2 фазы)" },
    { label: "Номинальная мощность", value: "1,87 кВт" },
    { label: "Класс пылевлагозащиты", value: "IPX4 (всепогодный)" },
    { label: "Рабочая температура", value: "от +4°C до +40°C" },
    { label: "Управление", value: "Автоматическая микропроцессорная плата (чип)" },
    { label: "Источники воды", value: "Подземные (скважины) и сетевые (водопровод)" },
    { label: "Насосная группа", value: "Отдельные насосы высокого давления (сырая вода + мембрана)" },
    { label: "Учет ресурсов", value: "Электросчётчик и водосчётчик включены" },
    { label: "Термозащита", value: "Отопительный блок (зима) + охлаждающие кулеры (лето)" },
    { label: "Гарантия производителя", value: "12 месяцев официальной гарантии" },
  ];

  // Key advantages
  const advantages = [
    {
      title: "Компьютерная плата управления",
      badge: "Smart Chip",
      desc: "Полностью автоматическая плата управления (чип), в отличие от устаревших полуавтоматов. Точный учет литража, самодиагностика и надежность.",
    },
    {
      title: "Высокая производительность 250 л/ч",
      badge: "0,25 м³/ч",
      desc: "Обеспечивает непрерывный налив даже в часы пикового спроса. Быстрое наполнение 5л и 19л емкостей без очередей.",
    },
    {
      title: "Двойная насосная станция 220В",
      badge: "Dual Pumps",
      desc: "Отдельные насосы высокого давления для сырой воды и мембраны, работающие от стандартной электросети 220 В. Стабильное давление осмоса.",
    },
    {
      title: "Любой источник исходной воды",
      badge: "Скважина + Сеть",
      desc: "Эффективная работа как с артезианской водой из скважин, так и с городской водопроводной водой любой степени жесткости.",
    },
    {
      title: "Всесезонный климат-пакет",
      badge: "-25°C .. +40°C",
      desc: "Встроенный отопительный блок защищает гидравлику от замерзания зимой, а принудительные кулеры спасают электронику от перегрева летом.",
    },
    {
      title: "Встроенный учет водо- и электроэнергии",
      badge: "Телеметрия",
      desc: "Установленные счетчики воды и электричества позволяют контролировать все эксплуатационные расходы и маржинальность бизнеса.",
    },
  ];

  return (
    <main className="vending-3d-page">
      {/* Site Header */}
      <header className="site-header">
        <div className="container header-inner">
          <a className="logo" href="/">
            <span className="logo-mark">V</span>
            <span>VendAI</span>
          </a>
          <nav>
            <a href="/">Главная</a>
            <a href="/catalog">Каталог</a>
            <a href="/vending-3d" className="active-nav">3D Вид XL-01</a>
            <a href="#purification">9 ступеней</a>
            <a href="#specs">Характеристики</a>
            <a href="#calculator">Окупаемость</a>
            <a href="#contacts">Контакты</a>
          </nav>
          <a className="header-phone" href="#contacts">Получить предложение</a>
        </div>
      </header>

      {/* Hero Showcase Section */}
      <section className="vending-hero">
        <div className="container">
          <div className="vending-hero-header">
            <div className="badge-row">
              <span className="hero-brand-badge">ATLANT FORTUNA LLC</span>
              <span className="hero-model-badge">МОДЕЛЬ XL-01</span>
              <span className="hero-warranty-badge">★ ГАРАНТИЯ 12 МЕСЯЦЕВ</span>
            </div>
            <h1>Интерактивная 3D-модель вендингового автомата по продаже воды</h1>
            <p className="hero-subtext">
              Вращайте автомат на 360°, изучайте внутреннее устройство 9-ступенчатой
              очистки через X-Ray, тестируйте налив воды и ночную подсветку.
            </p>
          </div>

          {/* 3D Visualizer Component */}
          <div className="vending-3d-container-box">
            <VendingMachine3D />
          </div>
        </div>
      </section>

      {/* Quick KPI stats strip */}
      <section className="kpi-strip">
        <div className="container kpi-grid">
          <div className="kpi-card">
            <strong>250 л/ч</strong>
            <span>Производительность (0,25 м³/ч)</span>
          </div>
          <div className="kpi-card">
            <strong>9 этапов</strong>
            <span>Очистки, минерализации и озона</span>
          </div>
          <div className="kpi-card">
            <strong>Vontron LP-4040</strong>
            <span>Мембрана с эффективностью 99%</span>
          </div>
          <div className="kpi-card">
            <strong>IPX4 / 220В</strong>
            <span>Всепогодный класс защиты</span>
          </div>
          <div className="kpi-card">
            <strong>Умный чип</strong>
            <span>Автоматическая плата управления</span>
          </div>
        </div>
      </section>

      {/* 9-Stage Purification System */}
      <section id="purification" className="section section-dark">
        <div className="container">
          <div className="section-title-wrap">
            <span className="eyebrow">ТЕХНОЛОГИЯ ВОДОПОДГОТОВКИ</span>
            <h2>9-ступенчатая система глубокой очистки и минерализации воды</h2>
            <p className="section-desc">
              Автомат XL-01 превращает любую скважинную или водопроводную воду
              в кристально чистую, безопасную и обогащенную минералами питьевую воду
              высшей категории.
            </p>
          </div>

          <div className="filtration-grid">
            {filtrationStages.map((stage) => (
              <div className="stage-card" key={stage.step}>
                <div className="stage-header">
                  <span className="stage-num">{stage.step}</span>
                  <span className="stage-icon">{stage.icon}</span>
                  <span className="stage-tag">{stage.tag}</span>
                </div>
                <h3>{stage.name}</h3>
                <span className="stage-role">{stage.role}</span>
                <p>{stage.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specifications & Real Photo Comparison */}
      <section id="specs" className="section">
        <div className="container">
          <div className="specs-split-grid">
            {/* Specs column */}
            <div className="specs-column">
              <span className="eyebrow">ИНЖЕНЕРНЫЕ ДАННЫЕ</span>
              <h2>Технические характеристики XL-01</h2>
              <p className="specs-intro">
                Оборудование изготовлено по строгим промышленным стандартам надежности,
                оснащено датчиками протока, антивандальной панелью и всесезонной термоизоляцией.
              </p>

              <div className="specs-table">
                {specs.map((item, idx) => (
                  <div className="specs-row" key={idx}>
                    <span className="specs-key">{item.label}</span>
                    <strong className="specs-val">{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Real Machine Photo & Factory Details */}
            <div className="factory-column">
              <span className="eyebrow">ЗАВОДСКОЕ ОБОРУДОВАНИЕ</span>
              <h3>Оригинальный автомат ATLANT FORTUNA</h3>
              <p className="factory-text">
                Оригинальная маркировка завода-производителя, фирменная лицевая панель
                Toza Suv Vending и сертификат соответствия стандартам питьевого водоснабжения.
              </p>

              <div className="photo-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/xl-01-photo.png"
                  alt="Вендинговый аппарат ATLANT FORTUNA XL-01"
                  className="real-photo"
                />
                <div className="photo-caption">
                  <span>Официальный постер модели XL-01 ATLANT FORTUNA LLC</span>
                  <strong>Сертифицировано для вендингового бизнеса</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Business Advantages */}
      <section className="section section-dark">
        <div className="container">
          <div className="section-title-wrap">
            <span className="eyebrow">ПРЕИМУЩЕСТВА ДЛЯ БИЗНЕСА</span>
            <h2>Почему вендинговый автомат XL-01 окупается быстрее</h2>
          </div>

          <div className="advantages-container">
            {advantages.map((adv, idx) => (
              <div className="adv-card" key={idx}>
                <span className="adv-badge">{adv.badge}</span>
                <h3>{adv.title}</h3>
                <p>{adv.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profitability Calculator */}
      <section id="calculator" className="section">
        <div className="container">
          <div className="calculator-box">
            <div className="calc-info">
              <span className="eyebrow">БИЗНЕС-КАЛЬКУЛЯТОР</span>
              <h2>Расчет окупаемости и ежемесячной прибыли</h2>
              <p>
                Оцените финансовый результат установки автомата XL-01 в спальном районе,
                около супермаркета или жилого комплекса.
              </p>

              <div className="calc-sliders">
                <div className="slider-group">
                  <div className="slider-header">
                    <label>Продажи в день:</label>
                    <strong>{litersPerDay} литров / сутки</strong>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="50"
                    value={litersPerDay}
                    onChange={(e) => setLitersPerDay(Number(e.target.value))}
                  />
                  <div className="slider-hints">
                    <span>100 л (старт)</span>
                    <span>500 л (средний трафик)</span>
                    <span>1500 л (высокий трафик)</span>
                  </div>
                </div>

                <div className="slider-group">
                  <div className="slider-header">
                    <label>Цена продажи за 1 литр:</label>
                    <strong>{pricePerLiter} UZS</strong>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="1200"
                    step="50"
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(Number(e.target.value))}
                  />
                </div>

                <div className="slider-group">
                  <div className="slider-header">
                    <label>Себестоимость литра (вода + картриджи):</label>
                    <strong>{costPerLiter} UZS</strong>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="150"
                    step="5"
                    value={costPerLiter}
                    onChange={(e) => setCostPerLiter(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="calc-result">
              <h3>Прогноз доходности (в месяц)</h3>
              
              <div className="result-metric">
                <span>Ежемесячная выручка:</span>
                <strong>{monthlyRevenue.toLocaleString("ru-RU")} UZS</strong>
              </div>

              <div className="result-metric">
                <span>Расходная часть (вода, фильтры, свет):</span>
                <span>{monthlyCost.toLocaleString("ru-RU")} UZS</span>
              </div>

              <div className="result-highlight">
                <span>Чистая прибыль в месяц:</span>
                <strong>{monthlyProfit.toLocaleString("ru-RU")} UZS</strong>
              </div>

              <div className="payback-estimate">
                <span>Ориентировочный срок окупаемости автомата:</span>
                <strong>3 – 6 месяцев</strong>
              </div>

              <a className="button button-primary" href="#contacts">
                Получить коммерческое предложение
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Lead Form Section */}
      <section id="contacts" className="cta-section">
        <div className="container cta">
          <div>
            <span className="eyebrow">ЗАКАЗАТЬ ОБОРУДОВАНИЕ</span>
            <h2>Забронируйте вендинговый аппарат XL-01</h2>
            <p>
              Оставьте заявку — наш инженер предоставит детальную консультацию по
              подключению к воде и электричеству, условиям доставки и гарантийному обслуживанию.
            </p>
            <div className="cta-features">
              <div>✓ Поставка напрямую от официального дистрибьютора</div>
              <div>✓ Полный комплект фильтров и мембрана Vontron в комплекте</div>
              <div>✓ Помощь в подборе прибыльной локации</div>
            </div>
          </div>
          <LeadForm />
        </div>
      </section>

      {/* AI Assistant Chat Widget */}
      <AIChat />

      {/* Footer */}
      <footer>
        <div className="container footer-inner">
          <strong>VendAI • ATLANT FORTUNA XL-01</strong>
          <span>Интеллектуальные вендинговые станции чистой питьевой воды</span>
          <span>© 2026</span>
        </div>
      </footer>
    </main>
  );
}
