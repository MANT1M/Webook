import React, { useState } from 'react';
import {
  Compass,
  Map as MapIcon,
  Navigation,
  MapPin,
  Info,
  X,
} from 'lucide-react';
import {
  QIBLA_CITY_PRESETS,
  QiblaCalculationResult,
  QiblaLocationState,
} from '../utils/qiblaGeodesy';
import { QiblaCompassView } from './QiblaCompassView';
import { QiblaYandexMapView } from './QiblaYandexMapView';

export interface QiblaFinderPanelProps {
  locationState: QiblaLocationState;
  qibla: QiblaCalculationResult;
  onSelectPresetCity: (cityId: string) => void;
  onRequestGps: () => void;
  onUpdatePinCoords: (lat: number, lon: number) => void;
  isLocatingGps: boolean;
  gpsError: string | null;
  onClose: () => void;
}

export const QiblaFinderPanel: React.FC<QiblaFinderPanelProps> = ({
  locationState,
  qibla,
  onSelectPresetCity,
  onRequestGps,
  onUpdatePinCoords,
  isLocatingGps,
  gpsError,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'compass' | 'yandex_map'>(
    'compass'
  );

  const bashkortostanCities = QIBLA_CITY_PRESETS.filter(
    (c) => c.region === 'Башкортостан'
  );
  const russiaCities = QIBLA_CITY_PRESETS.filter((c) => c.region === 'Россия');

  return (
    <div className="space-y-4">
      {/* ЗАГОЛОВОК И ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ (КОМПАС / ЯНДЕКС.КАРТА) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#06392c] shrink-0" />
            <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900">
              Направление Киблы ({locationState.labelRu})
            </h3>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Точный сферический расчёт на Досточтимую Каабу в Мекке (21.4225° с.ш., 39.8262° в.д.)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Переключатель вкладок */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('compass')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'compass'
                  ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Живой компас</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('yandex_map')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'yandex_map'
                  ? 'bg-[#06392c] text-[#fef3c7] shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Яндекс.Карта по дому</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
            title="Закрыть панель Киблы"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ВЫБОР ГОРОДА БАШКОРТОСТАНА / РФ И КНОПКА GPS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className="w-4 h-4 text-[#06392c] shrink-0" />
          <label
            htmlFor="qibla-city-select"
            className="text-xs font-semibold text-slate-600 shrink-0"
          >
            Город / район:
          </label>
          <select
            id="qibla-city-select"
            value={locationState.cityId}
            onChange={(e) => onSelectPresetCity(e.target.value)}
            className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#06392c] cursor-pointer"
          >
            {locationState.source === 'gps' && (
              <option value="custom_gps">
                📍 Моя геолокация GPS ({locationState.lat.toFixed(4)}°, {locationState.lon.toFixed(4)}°)
              </option>
            )}
            {locationState.source === 'map_pin' && (
              <option value="custom_pin">
                ⌂ Точка дома на карте ({locationState.lat.toFixed(4)}°, {locationState.lon.toFixed(4)}°)
              </option>
            )}
            <optgroup label="Республика Башкортостан">
              {bashkortostanCities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nameRu}
                  {city.nameTt ? ` (${city.nameTt})` : ''}
                </option>
              ))}
            </optgroup>
            <optgroup label="Другие города России">
              {russiaCities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.nameRu}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <button
          type="button"
          onClick={onRequestGps}
          disabled={isLocatingGps}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06392c] hover:bg-[#074938] text-[#fef3c7] text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-60"
        >
          <Navigation className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>
            {isLocatingGps ? 'Определяем GPS...' : 'Моё местоположение (GPS)'}
          </span>
        </button>
      </div>

      {gpsError && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-950">
          {gpsError}
        </div>
      )}

      {/* 3 ИНФОРМАЦИОННЫЕ КАРТОЧКИ ТОЧНЫХ ГЕОДЕЗИЧЕСКИХ ДАННЫХ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-2xl bg-white border border-slate-200/90 px-4 py-3">
          <div className="text-[11px] text-slate-500 font-medium">
            Истинный азимут Киблы
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-[#06392c]">
              {qibla.azimuthDeg.toFixed(1)}°
            </span>
            <span className="text-xs font-bold text-amber-800">
              {qibla.cardinalFullRu}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/90 px-4 py-3">
          <div className="text-[11px] text-slate-500 font-medium">
            Расстояние до Досточтимой Каабы
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-slate-900">
              {qibla.distanceKm.toLocaleString('ru-RU')} км
            </span>
            <span className="text-xs text-slate-500">по дуге Земли</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/90 px-4 py-3">
          <div className="text-[11px] text-slate-500 font-medium">
            Магнитное склонение региона
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="font-mono tabular-nums text-xl sm:text-2xl font-extrabold text-slate-900">
              {qibla.declinationDeg >= 0
                ? `+${qibla.declinationDeg}°`
                : `${qibla.declinationDeg}°`}
            </span>
            <span className="text-xs text-slate-500">
              Магн. азимут: {qibla.magneticAzimuthDeg.toFixed(1)}°
            </span>
          </div>
        </div>
      </div>

      {/* ОСНОВНОЕ СОДЕРЖИМОЕ: ВКЛАДКА 1 (КОМПАС) ИЛИ ВКЛАДКА 2 (ЯНДЕКС.КАРТА) */}
      {activeTab === 'compass' ? (
        <QiblaCompassView
          qibla={qibla}
          locationLabel={locationState.labelRu}
          onSwitchToMap={() => setActiveTab('yandex_map')}
        />
      ) : (
        <QiblaYandexMapView
          lat={locationState.lat}
          lon={locationState.lon}
          locationLabel={locationState.labelRu}
          qibla={qibla}
          onUpdatePinCoords={onUpdatePinCoords}
          onRequestGps={onRequestGps}
          isLocatingGps={isLocatingGps}
        />
      )}

      {/* ПАМЯТКА ТОЧНОСТИ И КАЛИБРОВКИ */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-3.5 sm:p-4 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#06392c] shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <div className="font-bold text-slate-900">
            Памятка для точного определения Киблы:
          </div>
          <p>
            1. <strong>При использовании компаса:</strong> держите смартфон горизонтально (параллельно полу), снимите чехол с магнитной застёжкой и отойдите от металлических дверей, батарей и ноутбуков. При сомнениях плавно опишите телефоном в воздухе «восьмёрку» (∞) для калибровки датчика.
          </p>
          <p>
            2. <strong>Самый надёжный способ в помещении:</strong> перейдите на вкладку <strong>«Яндекс.Карта по дому»</strong>, приблизьте свой дом, поставьте метку на своё окно и посмотрите, на какое соседнее здание или улицу направлен изумрудный луч Киблы.
          </p>
        </div>
      </div>
    </div>
  );
};
