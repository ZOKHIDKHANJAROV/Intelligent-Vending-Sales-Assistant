"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_ORDER, PARTS, PART_NUMBER } from "./vending3d/parts";
import type { CameraPreset, VendingSceneApi } from "./vending3d/scene";

const PRESET_BUTTONS: { id: CameraPreset; label: string }[] = [
  { id: "iso", label: "3D Обзор (360°)" },
  { id: "front", label: "Лицевая панель" },
  { id: "dispenser", label: "Камера налива" },
  { id: "controls", label: "Панель управления" },
  { id: "inside", label: "🔬 Внутри (X-Ray)" },
];

const partById = new Map(PARTS.map((p) => [p.id, p]));

export default function VendingMachine3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<VendingSceneApi | null>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDispensing, setIsDispensing] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isXrayMode, setIsXrayMode] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [explode, setExplode] = useState(0);
  const [activePreset, setActivePreset] = useState<CameraPreset | null>("iso");
  const [dispensedLiters, setDispensedLiters] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isPartsOpen, setIsPartsOpen] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1000px)").matches) setIsPartsOpen(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let api: VendingSceneApi | null = null;

    import("./vending3d/scene")
      .then(({ createVendingScene }) => {
        if (cancelled || !mountRef.current) return;
        api = createVendingScene(mountRef.current, {
          onSelect: (id) => {
            setSelectedId(id);
            if (id) {
              setIsAutoRotate(false);
              setActivePreset(null);
            }
          },
          onHover: (id) => setHoveredId(id),
          onDispenseProgress: (liters, done) => {
            setDispensedLiters(liters);
            if (done) setIsDispensing(false);
          },
        });
        labelRefs.current.forEach((el, id) => api!.setLabelElement(id, el));
        apiRef.current = api;
        setLoading(false);
      })
      .catch((err) => {
        console.error("3D scene failed to load", err);
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
      apiRef.current = null;
      api?.dispose();
    };
  }, []);

  // синхронизация React-состояния со сценой
  useEffect(() => apiRef.current?.setDispensing(isDispensing), [isDispensing, loading]);
  useEffect(() => apiRef.current?.setNight(isNightMode), [isNightMode, loading]);
  useEffect(() => apiRef.current?.setXray(isXrayMode), [isXrayMode, loading]);
  useEffect(() => apiRef.current?.setAutoRotate(isAutoRotate), [isAutoRotate, loading]);
  useEffect(() => apiRef.current?.setExplode(explode), [explode, loading]);

  // стабильные ref-колбэки для выносок, чтобы React не пересоздавал их на каждом рендере
  const labelRefCallbacks = useMemo(
    () =>
      new Map(
        PARTS.map((p) => [
          p.id,
          (el: HTMLDivElement | null) => {
            if (el) labelRefs.current.set(p.id, el);
            else labelRefs.current.delete(p.id);
            apiRef.current?.setLabelElement(p.id, el);
          },
        ]),
      ),
    [],
  );

  const selectPart = useCallback((id: string | null) => {
    setSelectedId(id);
    apiRef.current?.select(id);
    if (id) {
      setIsAutoRotate(false);
      setActivePreset(null);
    }
  }, []);

  const hoverPart = useCallback((id: string | null) => {
    setHoveredId(id);
    apiRef.current?.hover(id);
  }, []);

  const setCameraAngle = useCallback(
    (preset: CameraPreset) => {
      setActivePreset(preset);
      setIsAutoRotate(false);
      selectPart(null);
      if (preset === "inside") setIsXrayMode(true);
      apiRef.current?.setCameraPreset(preset);
    },
    [selectPart],
  );

  const toggleExplode = useCallback(() => {
    const next = explode > 0.5 ? 0 : 1;
    setExplode(next);
    setIsAutoRotate(false);
    selectPart(null);
    setActivePreset(next ? "exploded" : "iso");
    apiRef.current?.setCameraPreset(next ? "exploded" : "iso");
    if (next) setIsPartsOpen(true);
  }, [explode, selectPart]);

  const grouped = useMemo(
    () => CATEGORY_ORDER.map((cat) => ({ cat, items: PARTS.filter((p) => p.category === cat) })),
    [],
  );

  const selected = selectedId ? partById.get(selectedId) : null;
  const isExploded = explode > 0.5;

  return (
    <div className="vending-3d-wrapper">
      <div className="vending-3d-viewport">
        <div ref={mountRef} className="vending-3d-canvas-mount" />

        <div className="part-labels" aria-hidden={!isExploded}>
          {PARTS.map((p) => (
            <div
              key={p.id}
              ref={labelRefCallbacks.get(p.id)}
              className={`part-label ${p.id === selectedId || p.id === hoveredId ? "expanded" : ""}`}
              style={{ opacity: 0, visibility: "hidden" }}
              onClick={() => selectPart(p.id)}
              onMouseEnter={() => hoverPart(p.id)}
              onMouseLeave={() => hoverPart(null)}
            >
              <span className="part-label-num">{PART_NUMBER[p.id]}</span>
              <span className="part-label-name">{p.name}</span>
            </div>
          ))}
        </div>

        {loading && (
          <div className="vending-3d-loader">
            {loadError ? (
              <p>Не удалось загрузить 3D-модель. Обновите страницу.</p>
            ) : (
              <>
                <div className="loader-spinner" />
                <p>Загрузка 3D-модели автомата XL-01...</p>
              </>
            )}
          </div>
        )}

        {selected && (
          <div className="hotspot-popup part-info" key={selected.id}>
            <button type="button" className="hotspot-close" onClick={() => selectPart(null)} aria-label="Закрыть">
              ✕
            </button>
            <div className="part-info-badges">
              <span className="hotspot-badge">{selected.category}</span>
              {selected.stage && <span className="hotspot-badge stage">Ступень {selected.stage} / 9</span>}
            </div>
            <h4>
              <span className="part-info-num">{PART_NUMBER[selected.id]}</span>
              {selected.name}
            </h4>
            <p>{selected.description}</p>
            <div className="hotspot-spec">
              <strong>Параметры:</strong> {selected.spec}
            </div>
            <div className="hotspot-spec">
              <strong>Материал:</strong> {selected.material}
            </div>
          </div>
        )}
      </div>

      <div className="vending-3d-hud-top">
        <div className="vending-3d-presets">
          {PRESET_BUTTONS.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`preset-btn ${activePreset === b.id ? "active" : ""}`}
              onClick={() => setCameraAngle(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="vending-3d-toggles">
          <button
            type="button"
            className={`tool-btn ${isDispensing ? "active-dispense" : ""}`}
            onClick={() => setIsDispensing((v) => !v)}
            title="Запустить анимацию налива воды в бутыль"
          >
            💧 {isDispensing ? "Остановить налив" : "Тестовый налив"}
          </button>
          <button
            type="button"
            className={`tool-btn ${isNightMode ? "active-night" : ""}`}
            onClick={() => setIsNightMode((v) => !v)}
            title="Переключить ночную подсветку"
          >
            🌙 {isNightMode ? "День" : "Ночь"}
          </button>
          <button
            type="button"
            className={`tool-btn ${isXrayMode ? "active" : ""}`}
            onClick={() => setIsXrayMode((v) => !v)}
            title="Прозрачный корпус — видно внутренние узлы"
          >
            {isXrayMode ? "Корпус" : "Рентген"}
          </button>
          <button
            type="button"
            className={`tool-btn ${isAutoRotate ? "active" : ""}`}
            onClick={() => setIsAutoRotate((v) => !v)}
            title="Автоповорот 360 градусов"
          >
            🔄 Вращение
          </button>
          <button
            type="button"
            className={`tool-btn ${isPartsOpen ? "active" : ""}`}
            onClick={() => setIsPartsOpen((v) => !v)}
            title="Список деталей автомата"
          >
            📋 Состав
          </button>
        </div>
      </div>

      {isPartsOpen && (
        <aside className="parts-panel">
          <div className="parts-panel-head">
            <strong>Из чего состоит XL-01</strong>
            <span>{PARTS.length} узлов</span>
          </div>
          <div className="parts-panel-list">
            {grouped.map(({ cat, items }) => (
              <div key={cat} className="parts-group">
                <div className="parts-group-title">{cat}</div>
                {items.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`part-item ${p.id === selectedId ? "active" : ""} ${p.id === hoveredId ? "hovered" : ""}`}
                    onClick={() => selectPart(p.id === selectedId ? null : p.id)}
                    onMouseEnter={() => hoverPart(p.id)}
                    onMouseLeave={() => hoverPart(null)}
                  >
                    <span className="part-num">{PART_NUMBER[p.id]}</span>
                    <span className="part-name">{p.name}</span>
                    {p.stage && <span className="part-stage">{p.stage}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
      )}

      <div className="vending-3d-hud-bottom">
        <div className="telemetry-card">
          <span className="telemetry-label">СТАТУС ОБОРУДОВАНИЯ</span>
          <div className="telemetry-val">
            <span className={`status-dot ${isDispensing ? "pulsing" : ""}`} />
            {isDispensing ? `ИДЁТ НАЛИВ • ${dispensedLiters.toFixed(1)} / 18.9 Л` : "ОЖИДАНИЕ КЛИЕНТА • READY"}
          </div>
        </div>

        <div className="telemetry-card explode-card">
          <div className="explode-row">
            <span className="telemetry-label">РАЗБОРКА НА ДЕТАЛИ</span>
            <button type="button" className={`explode-btn ${isExploded ? "active" : ""}`} onClick={toggleExplode}>
              {isExploded ? "🔧 Собрать" : "🧩 Разобрать"}
            </button>
          </div>
          <input
            type="range"
            className="explode-slider"
            min={0}
            max={100}
            value={Math.round(explode * 100)}
            onChange={(e) => {
              setExplode(Number(e.target.value) / 100);
              setIsAutoRotate(false);
            }}
            aria-label="Степень разборки"
          />
        </div>

        <div className="telemetry-card">
          <span className="telemetry-label">УПРАВЛЕНИЕ</span>
          <div className="telemetry-val text-muted">Клик по детали — описание • ЛКМ — вращение • Колесо — зум</div>
        </div>
      </div>
    </div>
  );
}
