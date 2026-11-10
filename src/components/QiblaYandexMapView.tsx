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

type MapTileMode = 'yandex_map' | 'yandex_hybrid' | 'osm_fallback';

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
  const userMarkerRef = useRef<L.Marker | null>(null);
  const overlaysGroupRef = useRef<L.LayerGroup | null>(null);

  const [tileMode, setTileMode] = useState<MapTileMode>('yandex_map');
  const [yandexTileErrorCount, setYandexTileErrorCount] = useState<number>(0);

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

  // Пересоздание карты при переключении проекции (Яндекс EPSG:3395 vs Резерв EPSG:3857)
  const isYandexProjection = tileMode !== 'osm_fallback';

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Если карта уже инициализирована, удаляем перед сменой CRS
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      userMarkerRef.current = null;
      overlaysGroupRef.current = null;
    }

    // Яндекс.Карты используют эллиптическую проекцию Меркатора WGS-84 (EPSG:3395)
    const targetCrs = isYandexProjection ? L.CRS.EPSG3395 : L.CRS.EPSG3857;

    const map = L.map(container, {
      crs: targetCrs,
      center: [lat, lon],
      zoom: 16,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: true,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    // Подключаем выбранный слой тайлов
    if (tileMode === 'yandex_map') {
      const yandexScheme = L.tileLayer(
        'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&v=24.12.01-0&x={x}&y={y}&z={z}&scale=2&lang=ru_RU',
        {
          attribution: '© Яндекс.Карты',
          maxZoom: 19,
          Subdomains: ['01', '02', '03', '04'],
        } as L.TileLayerOptions
      );
      yandexScheme.on('tileerror', () => {
        setYandexTileErrorCount((c) => c + 1);
      });
      yandexScheme.addTo(map);
    } else if (tileMode === 'yandex_hybrid') {
      const yandexSat = L.tileLayer(
        'https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&lang=ru_RU',
        {
          attribution: '© Яндекс.Спутник',
          maxZoom: 19,
        }
      );
      const yandexLabels = L.tileLayer(
        'https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&x={x}&y={y}&z={z}&scale=2&lang=ru_RU',
        {
          attribution: '© Яндекс',
          maxZoom: 19,
        }
      );
      yandexSat.addTo(map);
      yandexLabels.addTo(map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
    }

    // Создаём слой для линий Киблы и маркера Каабы
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
      onUpdatePinCoords(
        Math.round(pos.lat * 1000000) / 1000000,
        Math.round(pos.lng * 1000000) / 1000000
      );
    });

    userMarkerRef.current = marker;

    // Клик в любое место карты переставляет метку дома
    map.on('click', (e: L.LeafletMouseEvent) => {
      onUpdatePinCoords(
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
      userMarkerRef.current = null;
      overlaysGroupRef.current = null;
    };
  }, [tileMode, isYandexProjection]);

  // Автоматическое переключение на резервную карту, если Яндекс.Карты заблокированы сетью/VPN
  useEffect(() => {
    if (yandexTileErrorCount >= 6 && tileMode !== 'osm_fallback') {
      setTileMode('osm_fallback');
    }
  }, [yandexTileErrorCount, tileMode]);

  // Обновление положения маркера и перерисовка лучей Киблы при изменении координат
  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = userMarkerRef.current;
    const overlays = overlaysGroupRef.current;
    if (!map || !marker || !overlays) return;

    marker.setLatLng([lat, lon]);
    overlays.clearLayers();

    // 1. Полная геодезическая дуга (ортодромия) до Досточтимой Каабы в Мекке
    L.polyline(geodesicArcPoints, {
      color: '#06392c',
      weight: 3,
      opacity: 0.65,
      dashArray: '8, 6',
    }).addTo(overlays);

    // 2. Яркий локальный луч точного начального азимута Киблы (25 км) поверх домов и кварталов
    L.polyline(
      [
        [lat, lon],
        localRayPoints.p150m,
        localRayPoints.p600m,
        localRayPoints.p2km,
        localRayPoints.p25km,
      ],
      {
        color: '#d97706',
        weight: 6,
        opacity: 0.35,
      }
    ).addTo(overlays);

    L.polyline(
      [
        [lat, lon],
        localRayPoints.p150m,
        localRayPoints.p600m,
        localRayPoints.p2km,
        localRayPoints.p25km,
      ],
      {
        color: '#10b981',
        weight: 3.5,
        opacity: 0.95,
      }
    ).addTo(overlays);

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
  }, [lat, lon, qibla, localRayPoints, geodesicArcPoints]);

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

        {/* Переключатель слоёв Яндекс.Карт */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <Layers className="w-3.5 h-3.5 text-slate-500 ml-1.5 hidden sm:inline shrink-0" />
          <button
            type="button"
            onClick={() => {
              setYandexTileErrorCount(0);
              setTileMode('yandex_map');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tileMode === 'yandex_map'
                ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Яндекс Схема
          </button>
          <button
            type="button"
            onClick={() => {
              setYandexTileErrorCount(0);
              setTileMode('yandex_hybrid');
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tileMode === 'yandex_hybrid'
                ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Яндекс Спутник
          </button>
          <button
            type="button"
            onClick={() => setTileMode('osm_fallback')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              tileMode === 'osm_fallback'
                ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
            title="Резервная схема домов (если включён зарубежный VPN)"
          >
            Схема 2
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
              <strong>Как проверить по дому:</strong> нажмите на свой дом (или перетащите круглую метку <strong>⌂</strong> на своё окно). Изумрудный луч со стрелками показывает точное направление на Каабу (<strong>{qibla.azimuthDeg.toFixed(1)}° {qibla.cardinalShortRu}</strong>).
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
