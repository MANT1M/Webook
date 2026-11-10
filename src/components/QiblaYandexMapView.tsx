import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Home,
  Globe,
  Layers,
  MapPin,
} from 'lucide-react';
import {
  KAABA_COORDS,
  QiblaCalculationResult,
  computeDestinationPoint,
  computeGeodesicArcToKaaba,
} from '../utils/qiblaGeodesy';

export interface QiblaYandexMapViewProps {
  lat: number;
  lon: number;
  locationLabel: string;
  qibla: QiblaCalculationResult;
  onUpdatePinCoords: (newLat: number, newLon: number) => void;
  onRequestGps: () => void;
  isLocatingGps: boolean;
}

type MapTileMode = 'yandex_map' | 'yandex_hybrid';

export const QiblaYandexMapView: React.FC<QiblaYandexMapViewProps> = ({
  lat,
  lon,
  locationLabel,
  qibla,
  onUpdatePinCoords,
  onRequestGps,
  isLocatingGps,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const overlaysGroupRef = useRef<L.LayerGroup | null>(null);
  const onUpdatePinCoordsRef = useRef(onUpdatePinCoords);
  onUpdatePinCoordsRef.current = onUpdatePinCoords;

  const [tileMode, setTileMode] = useState<MapTileMode>('yandex_map');

  // Точки локального луча (точное направление начального азимута Киблы по сферической формуле)
  const localRayPoints = useMemo(() => {
    const p150m = computeDestinationPoint(lat, lon, qibla.azimuthDeg, 0.15);
    const p600m = computeDestinationPoint(lat, lon, qibla.azimuthDeg, 0.6);
    const p2km = computeDestinationPoint(lat, lon, qibla.azimuthDeg, 2.5);
    const p25km = computeDestinationPoint(lat, lon, qibla.azimuthDeg, 25);
    return {
      p150m,
      p600m,
      p2km,
      p25km,
    };
  }, [lat, lon, qibla.azimuthDeg]);

  // Полная ортодромия (геодезическая дуга из 96 сферических точек) до Каабы в Мекке
  const geodesicArcPoints = useMemo(
    () => computeGeodesicArcToKaaba(lat, lon, 96),
    [lat, lon]
  );

  // Инициализация карты один раз в эллиптической проекции Яндекс.Карт (EPSG:3395)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const map = L.map(container, {
      crs: L.CRS.EPSG3395,
      center: [lat, lon],
      zoom: 16,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    // Отдельный слой для тайлов подложки (Схема / Спутник)
    const tileGroup = L.layerGroup().addTo(map);
    tileLayerGroupRef.current = tileGroup;

    // Отдельный слой для линий Киблы и маркера Каабы (всегда поверх тайлов)
    const overlays = L.layerGroup().addTo(map);
    overlaysGroupRef.current = overlays;

    // Кастомная иконка маркера дома пользователя (перетаскиваемая)
    const homeIcon = L.divIcon({
      className: 'qibla-user-home-pin',
      html: `
        <div style="
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: #06392c;
          border: 3px solid #fbbf24;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fef3c7;
          font-weight: bold;
          font-size: 15px;
          cursor: grab;
        " title="Перетащите метку на свой дом или окно">
          ⌂
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const marker = L.marker([lat, lon], {
      icon: homeIcon,
      draggable: true,
      title: 'Ваш дом (перетащите на нужное окно или подъезд)',
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      onUpdatePinCoordsRef.current(
        Math.round(pos.lat * 1000000) / 1000000,
        Math.round(pos.lng * 1000000) / 1000000
      );
    });

    userMarkerRef.current = marker;

    // Клик в любое место карты переставляет метку дома
    map.on('click', (e: L.LeafletMouseEvent) => {
      onUpdatePinCoordsRef.current(
        Math.round(e.latlng.lat * 1000000) / 1000000,
        Math.round(e.latlng.lng * 1000000) / 1000000
      );
    });

    // Корректный пересчёт размера контейнера при раскрытии панели
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerGroupRef.current = null;
      userMarkerRef.current = null;
      overlaysGroupRef.current = null;
    };
  }, []);

  // Переключение слоёв «Яндекс Схема» и «Яндекс Спутник» без пересоздания карты и без потери линии Киблы
  useEffect(() => {
    const tileGroup = tileLayerGroupRef.current;
    if (!tileGroup) return;

    tileGroup.clearLayers();

    if (tileMode === 'yandex_map') {
      const yandexScheme = L.tileLayer(
        'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=24.12.01-0&x={x}&y={y}&z={z}&scale=2&lang=ru_RU',
        {
          maxZoom: 19,
        }
      );
      yandexScheme.addTo(tileGroup);
    } else {
      const yandexSat = L.tileLayer(
        'https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&lang=ru_RU',
        {
          maxZoom: 19,
        }
      );
      const yandexLabels = L.tileLayer(
        'https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&x={x}&y={y}&z={z}&scale=2&lang=ru_RU',
        {
          maxZoom: 19,
        }
      );
      yandexSat.addTo(tileGroup);
      yandexLabels.addTo(tileGroup);
    }
  }, [tileMode]);

  // Обновление положения маркера и перерисовка лучей Киблы при изменении координат или режима карты
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = userMarkerRef.current;
    const overlays = overlaysGroupRef.current;
    if (!map || !marker || !overlays) return;

    marker.setLatLng([lat, lon]);
    overlays.clearLayers();

    // 1. Полная геодезическая дуга (ортодромия) до Досточтимой Каабы в Мекке
    const arcLine = L.polyline(geodesicArcPoints, {
      color: tileMode === 'yandex_hybrid' ? '#fef3c7' : '#06392c',
      weight: 3,
      opacity: 0.75,
      dashArray: '8, 6',
    }).addTo(overlays);

    // 2. Яркий локальный луч точного начального азимута Киблы (25 км) поверх домов и кварталов
    const glowLine = L.polyline(
      [
        [lat, lon],
        localRayPoints.p150m,
        localRayPoints.p600m,
        localRayPoints.p2km,
        localRayPoints.p25km,
      ],
      {
        color: '#fbbf24',
        weight: 7,
        opacity: 0.45,
      }
    ).addTo(overlays);

    const mainRayLine = L.polyline(
      [
        [lat, lon],
        localRayPoints.p150m,
        localRayPoints.p600m,
        localRayPoints.p2km,
        localRayPoints.p25km,
      ],
      {
        color: '#10b981',
        weight: 4,
        opacity: 0.98,
      }
    ).addTo(overlays);

    arcLine.bringToFront();
    glowLine.bringToFront();
    mainRayLine.bringToFront();

    // 3. Метка Досточтимой Каабы в Мекке
    const kaabaIcon = L.divIcon({
      className: 'qibla-kaaba-pin',
      html: `
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #111827;
          border: 2.5px solid #fbbf24;
          box-shadow: 0 4px 14px rgba(0,0,0,0.45);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fef3c7;
          font-size: 10px;
          font-weight: bold;
        " title="Досточтимая Кааба (Мекка)">
          <div style="width: 22px; height: 3px; background: #fbbf24; margin-bottom: 2px;"></div>
          <span>Кааба</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    L.marker([KAABA_COORDS.lat, KAABA_COORDS.lon], {
      icon: kaabaIcon,
      title: 'Досточтимая Кааба · Мекка',
    })
      .bindPopup(
        `<strong>Досточтимая Кааба (Мекка)</strong><br/>Азимут из выбранной точки: <strong>${qibla.azimuthDeg.toFixed(1)}° (${qibla.cardinalShortRu})</strong><br/>Расстояние: <strong>${qibla.distanceKm.toLocaleString('ru-RU')} км</strong>`
      )
      .addTo(overlays);
  }, [lat, lon, qibla, localRayPoints, geodesicArcPoints, tileMode]);

  // Кнопка «К моему дому (масштаб двора)»
  const handleFocusUserHome = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setView([lat, lon], 17, { animate: true });
  };

  // Кнопка «Показать весь путь до Мекки»
  const handleShowFullPathToMecca = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([
      [lat, lon],
      [KAABA_COORDS.lat, KAABA_COORDS.lon],
    ]);
    map.fitBounds(bounds, { padding: [36, 36], animate: true });
  };

  return (
    <div className="space-y-3">
      {/* Панель управления Яндекс.Картой */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-2xl p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleFocusUserHome}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#06392c] text-[#fef3c7] hover:bg-[#074938] text-xs font-bold transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>К моему дому (двор)</span>
          </button>

          <button
            type="button"
            onClick={onRequestGps}
            disabled={isLocatingGps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#06392c] text-xs font-bold transition cursor-pointer disabled:opacity-60"
          >
            <Navigation className="w-3.5 h-3.5 shrink-0" />
            <span>{isLocatingGps ? 'Поиск GPS...' : 'Найти мой дом (GPS)'}</span>
          </button>

          <button
            type="button"
            onClick={handleShowFullPathToMecca}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#06392c] shrink-0" />
            <span>Весь путь до Мекки</span>
          </button>
        </div>

        {/* Переключатель слоёв Яндекс.Карт: только Яндекс Схема и Яндекс Спутник */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <Layers className="w-3.5 h-3.5 text-slate-500 ml-1.5 hidden sm:inline shrink-0" />
          <button
            type="button"
            onClick={() => setTileMode('yandex_map')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tileMode === 'yandex_map'
                ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Яндекс Схема
          </button>
          <button
            type="button"
            onClick={() => setTileMode('yandex_hybrid')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tileMode === 'yandex_hybrid'
                ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Яндекс Спутник
          </button>
        </div>
      </div>

      {/* Контейнер интерактивной Яндекс.Карты */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#06392c]/25 bg-slate-100 shadow-xs">
        <div
          ref={mapContainerRef}
          className="w-full h-[380px] sm:h-[460px] z-0"
        />

        {/* Плавающая плашка поверх карты с подсказкой */}
        <div className="bg-white/95 backdrop-blur-xs border-t border-slate-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#06392c] shrink-0" />
            <span>
              <strong>Как проверить по дому:</strong> нажмите на свой дом (или перетащите круглую метку <strong>⌂</strong> на своё окно). Изумрудный луч показывает точное направление на Каабу (<strong>{qibla.azimuthDeg.toFixed(1)}° {qibla.cardinalShortRu}</strong>).
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500 shrink-0">
            {locationLabel}: [{lat.toFixed(4)}, {lon.toFixed(4)}]
          </span>
        </div>
      </div>
    </div>
  );
};
