import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Compass,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { QiblaCalculationResult } from '../utils/qiblaGeodesy';

export interface QiblaCompassViewProps {
  qibla: QiblaCalculationResult;
  locationLabel: string;
  onSwitchToMap: () => void;
}

interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

interface DeviceOrientationEventConstructoriOS {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

export const QiblaCompassView: React.FC<QiblaCompassViewProps> = ({
  qibla,
  locationLabel,
  onSwitchToMap,
}) => {
  const [sensorStatus, setSensorStatus] = useState<
    'idle' | 'active_ios' | 'active_android' | 'unsupported' | 'denied'
  >('idle');
  const [useDeclinationCorrection, setUseDeclinationCorrection] =
    useState<boolean>(true);
  const [rawDeviceHeading, setRawDeviceHeading] = useState<number | null>(null);
  const [smoothedHeading, setSmoothedHeading] = useState<number>(0);
  const [continuousDialRotation, setContinuousDialRotation] =
    useState<number>(0);
  const [manualTestHeading, setManualTestHeading] = useState<number | null>(
    null
  );
  const [sensorAccuracyDeg, setSensorAccuracyDeg] = useState<number | null>(
    null
  );

  const lastVibratedAlignedRef = useRef<boolean>(false);
  const smoothedHeadingRef = useRef<number | null>(null);
  const continuousRotationRef = useRef<number>(0);

  // Определяем, нужно ли запрашивать разрешение по кнопке (iOS 13+)
  const isIOSPermissionRequired = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ctor =
      window.DeviceOrientationEvent as unknown as DeviceOrientationEventConstructoriOS;
    return typeof ctor?.requestPermission === 'function';
  }, []);

  const isSensorActive =
    sensorStatus === 'active_ios' || sensorStatus === 'active_android';

  // Итоговый курс верха телефона относительно Истинного Севера (0..360°)
  const effectivePhoneHeading = useMemo(() => {
    if (manualTestHeading !== null) {
      return ((manualTestHeading % 360) + 360) % 360;
    }
    if (!isSensorActive || rawDeviceHeading === null) {
      return 0; // В статичном режиме верх компаса = Север (0°)
    }
    return ((smoothedHeading % 360) + 360) % 360;
  }, [
    manualTestHeading,
    isSensorActive,
    rawDeviceHeading,
    smoothedHeading,
  ]);

  // Экранный угол стрелки Киблы относительно верха телефона (0° = телефон смотрит точно на Киблу)
  const relativeQiblaAngle = useMemo(() => {
    return ((qibla.azimuthDeg - effectivePhoneHeading) % 360 + 360) % 360;
  }, [qibla.azimuthDeg, effectivePhoneHeading]);

  // Кратчайшее отклонение от курса Киблы (-180..+180°)
  const signedDeltaDeg = useMemo(() => {
    let diff = qibla.azimuthDeg - effectivePhoneHeading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }, [qibla.azimuthDeg, effectivePhoneHeading]);

  const absDeltaDeg = Math.abs(signedDeltaDeg);
  const isAlignedWithQibla =
    (isSensorActive || manualTestHeading !== null) && absDeltaDeg <= 5;

  // Виброотклик при точном наведении на Киблу (однократно при входе в сектор ±5°)
  useEffect(() => {
    if (isAlignedWithQibla && !lastVibratedAlignedRef.current) {
      lastVibratedAlignedRef.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(40);
        } catch {
          // Игнорируем, если браузер блокирует вибрацию
        }
      }
    } else if (!isAlignedWithQibla && absDeltaDeg > 7) {
      lastVibratedAlignedRef.current = false;
    }
  }, [isAlignedWithQibla, absDeltaDeg]);

  // Плавное сглаживание (low-pass) и расчёт непрерывного угла поворота картушки без скачка 359° -> 0°
  useEffect(() => {
    const targetHeading =
      manualTestHeading !== null
        ? manualTestHeading
        : rawDeviceHeading !== null
          ? rawDeviceHeading
          : 0;

    if (smoothedHeadingRef.current === null) {
      smoothedHeadingRef.current = targetHeading;
      setSmoothedHeading(targetHeading);
      continuousRotationRef.current = -targetHeading;
      setContinuousDialRotation(-targetHeading);
      return;
    }

    const prev = smoothedHeadingRef.current;
    let delta = targetHeading - prev;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    // Коэффициент сглаживания 0.28 убирает мелкую дрожь магнитометра
    const nextSmoothed = ((prev + delta * 0.28) % 360 + 360) % 360;
    smoothedHeadingRef.current = nextSmoothed;
    setSmoothedHeading(nextSmoothed);

    // Непрерывный угол вращения картушки (-heading) по кратчайшей дуге
    const desiredDialAngle = -nextSmoothed;
    let dialDiff = desiredDialAngle - continuousRotationRef.current;
    while (dialDiff > 180) dialDiff -= 360;
    while (dialDiff < -180) dialDiff += 360;
    const nextContinuous = continuousRotationRef.current + dialDiff;
    continuousRotationRef.current = nextContinuous;
    setContinuousDialRotation(nextContinuous);
  }, [rawDeviceHeading, manualTestHeading]);

  // Подписка на датчики ориентации
  useEffect(() => {
    if (sensorStatus !== 'active_ios' && sensorStatus !== 'active_android') {
      return;
    }

    let receivedValidEvent = false;

    const getScreenOrientationOffset = (): number => {
      if (
        typeof window !== 'undefined' &&
        window.screen?.orientation &&
        typeof window.screen.orientation.angle === 'number'
      ) {
        return window.screen.orientation.angle;
      }
      return 0;
    };

    const handleOrientation = (event: Event) => {
      const e = event as DeviceOrientationEventiOS;

      // 1. iOS Safari: webkitCompassHeading (по часовой стрелке от Севера)
      if (
        typeof e.webkitCompassHeading === 'number' &&
        !Number.isNaN(e.webkitCompassHeading)
      ) {
        receivedValidEvent = true;
        if (typeof e.webkitCompassAccuracy === 'number' && e.webkitCompassAccuracy >= 0) {
          setSensorAccuracyDeg(Math.round(e.webkitCompassAccuracy));
        }
        const screenOffset = getScreenOrientationOffset();
        const heading = (e.webkitCompassHeading + screenOffset + 360) % 360;
        setRawDeviceHeading(heading);
        return;
      }

      // 2. Android Chrome / стандартный W3C: deviceorientationabsolute или absolute === true
      if (typeof e.alpha === 'number' && !Number.isNaN(e.alpha)) {
        // Проверяем, абсолютный ли это угол (если поле absolute есть и равно false — пропускаем)
        if (e.type === 'deviceorientation' && e.absolute === false) {
          return;
        }
        receivedValidEvent = true;
        const screenOffset = getScreenOrientationOffset();
        // В W3C alpha увеличивается против часовой стрелки, поэтому курс по часовой = 360 - alpha
        const magneticHeading = (360 - e.alpha + screenOffset + 360) % 360;
        // Прибавляем восточное магнитное склонение (+12.8° для Уфы), чтобы получить Истинный Север
        const trueHeading = useDeclinationCorrection
          ? (magneticHeading + qibla.declinationDeg + 360) % 360
          : magneticHeading;
        setRawDeviceHeading(trueHeading);
      }
    };

    window.addEventListener(
      'deviceorientationabsolute',
      handleOrientation,
      true
    );
    window.addEventListener('deviceorientation', handleOrientation, true);

    const checkTimeout = window.setTimeout(() => {
      if (!receivedValidEvent) {
        setSensorStatus('unsupported');
      }
    }, 2200);

    return () => {
      window.clearTimeout(checkTimeout);
      window.removeEventListener(
        'deviceorientationabsolute',
        handleOrientation,
        true
      );
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [sensorStatus, useDeclinationCorrection, qibla.declinationDeg]);

  // Обработчик кнопки «Включить живой компас»
  const handleStartLiveCompass = async () => {
    setManualTestHeading(null);
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
      setSensorStatus('unsupported');
      return;
    }

    const ctor =
      window.DeviceOrientationEvent as unknown as DeviceOrientationEventConstructoriOS;

    if (typeof ctor?.requestPermission === 'function') {
      try {
        const response = await ctor.requestPermission();
        if (response === 'granted') {
          setSensorStatus('active_ios');
        } else {
          setSensorStatus('denied');
        }
      } catch {
        setSensorStatus('denied');
      }
    } else {
      setSensorStatus('active_android');
    }
  };

  // Деления шкалы компаса (каждые 5°, подписи каждые 30°)
  const degreeTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let deg = 0; deg < 360; deg += 5) {
      ticks.push(deg);
    }
    return ticks;
  }, []);

  const cardinalMarks = [
    { deg: 0, label: 'С', isNorth: true, isMajor: true },
    { deg: 45, label: 'СВ', isNorth: false, isMajor: false },
    { deg: 90, label: 'В', isNorth: false, isMajor: true },
    { deg: 135, label: 'ЮВ', isNorth: false, isMajor: false },
    { deg: 180, label: 'Ю', isNorth: false, isMajor: true },
    { deg: 225, label: 'ЮЗ', isNorth: false, isMajor: false },
    { deg: 270, label: 'З', isNorth: false, isMajor: true },
    { deg: 315, label: 'СЗ', isNorth: false, isMajor: false },
  ];

  // Подсказка куда повернуть телефон
  const turnInstructionRu = useMemo(() => {
    if (!isSensorActive && manualTestHeading === null) {
      return `Статичный режим: Кибла находится на угле ${qibla.azimuthDeg.toFixed(1)}° (${qibla.cardinalShortRu}) по часовой стрелке от Севера`;
    }
    if (isAlignedWithQibla) {
      return 'Вы направлены точно в сторону Досточтимой Каабы!';
    }
    const dirWord = signedDeltaDeg > 0 ? 'вправо (по часовой)' : 'влево (против часовой)';
    return `Повернитесь на ${Math.round(absDeltaDeg)}° ${dirWord}`;
  }, [
    isSensorActive,
    manualTestHeading,
    qibla.azimuthDeg,
    qibla.cardinalShortRu,
    isAlignedWithQibla,
    signedDeltaDeg,
    absDeltaDeg,
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
      {/* ЛЕВАЯ/ЦЕНТРАЛЬНАЯ ЧАСТЬ: КРУГОВОЙ SVG-КОМПАС */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Верхний прицел «Верх телефона» */}
        <div className="flex flex-col items-center mb-1.5">
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-colors ${
              isAlignedWithQibla
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-[#fef3c7]'
            }`}
          >
            {isSensorActive || manualTestHeading !== null
              ? `Курс телефона: ${Math.round(effectivePhoneHeading)}°`
              : 'Север сверху · 0°'}
          </div>
          <div
            className={`w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[9px] mt-0.5 ${
              isAlignedWithQibla ? 'border-t-emerald-600' : 'border-t-slate-800'
            }`}
          />
        </div>

        {/* Контейнер SVG-компаса */}
        <div
          className={`relative w-72 h-72 sm:w-84 sm:h-84 rounded-full p-2 transition-all duration-300 ${
            isAlignedWithQibla
              ? 'bg-emerald-500/15 ring-4 ring-emerald-500 shadow-lg shadow-emerald-900/15'
              : 'bg-white ring-1 ring-slate-200 shadow-md'
          }`}
        >
          <svg
            viewBox="0 0 320 320"
            className="w-full h-full select-none overflow-visible"
            aria-label={`Компас направления Киблы: ${qibla.azimuthDeg} градусов`}
          >
            <defs>
              <radialGradient id="qiblaDialGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#074233" />
                <stop offset="75%" stopColor="#06392c" />
                <stop offset="100%" stopColor="#04271e" />
              </radialGradient>
              <linearGradient id="qiblaGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>

            {/* Неподвижный внешний обод */}
            <circle
              cx="160"
              cy="160"
              r="154"
              fill="url(#qiblaDialGrad)"
              stroke={isAlignedWithQibla ? '#10b981' : '#d97706'}
              strokeWidth={isAlignedWithQibla ? '3.5' : '2'}
            />

            {/* Вращающаяся картушка компаса (-heading) */}
            <g
              style={{
                transform: `rotate(${continuousDialRotation}deg)`,
                transformOrigin: '160px 160px',
                transition:
                  isSensorActive || manualTestHeading !== null
                    ? 'transform 120ms linear'
                    : 'transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Внутренние концентрические кольца */}
              <circle
                cx="160"
                cy="160"
                r="128"
                fill="none"
                stroke="rgba(254, 243, 199, 0.14)"
                strokeWidth="1"
              />
              <circle
                cx="160"
                cy="160"
                r="92"
                fill="none"
                stroke="rgba(254, 243, 199, 0.12)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Деления градусов (0..355°) */}
              {degreeTicks.map((deg) => {
                const isMajor30 = deg % 30 === 0;
                const isMid15 = deg % 15 === 0;
                const y1 = 10;
                const y2 = isMajor30 ? 20 : isMid15 ? 16 : 13.5;
                return (
                  <g key={deg} transform={`rotate(${deg} 160 160)`}>
                    <line
                      x1="160"
                      y1={y1}
                      x2="160"
                      y2={y2}
                      stroke={
                        deg === 0
                          ? '#ef4444'
                          : isMajor30
                            ? '#fef3c7'
                            : 'rgba(254, 243, 199, 0.4)'
                      }
                      strokeWidth={isMajor30 ? '1.8' : '1'}
                    />
                    {isMajor30 && deg % 90 !== 0 && (
                      <text
                        x="160"
                        y="30"
                        textAnchor="middle"
                        fill="rgba(254, 243, 199, 0.65)"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {deg}°
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 8 основных румбов (С, СВ, В, ЮВ, Ю, ЮЗ, З, СЗ) */}
              {cardinalMarks.map((mark) => (
                <g key={mark.label} transform={`rotate(${mark.deg} 160 160)`}>
                  {mark.isNorth && (
                    <polygon
                      points="160,18 155,28 165,28"
                      fill="#ef4444"
                    />
                  )}
                  <text
                    x="160"
                    y={mark.isMajor ? '43' : '41'}
                    textAnchor="middle"
                    fill={
                      mark.isNorth
                        ? '#fca5a5'
                        : mark.isMajor
                          ? '#fef3c7'
                          : 'rgba(254, 243, 199, 0.7)'
                    }
                    fontSize={mark.isMajor ? '13' : '10'}
                    fontWeight="700"
                  >
                    {mark.label}
                  </text>
                </g>
              ))}

              {/* ЗОЛОТОЙ ЛУЧ И СТРЕЛКА КИБЛЫ НА УГЛЕ qibla.azimuthDeg */}
              <g transform={`rotate(${qibla.azimuthDeg} 160 160)`}>
                {/* Подсветка сектора Киблы */}
                <path
                  d="M 160 160 L 148 34 A 128 128 0 0 1 172 34 Z"
                  fill={
                    isAlignedWithQibla
                      ? 'rgba(16, 185, 129, 0.28)'
                      : 'rgba(251, 191, 36, 0.18)'
                  }
                />

                {/* Главная стрелка Киблы от центра к Каабе */}
                <line
                  x1="160"
                  y1="190"
                  x2="160"
                  y2="52"
                  stroke={isAlignedWithQibla ? '#34d399' : '#fbbf24'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <polygon
                  points="160,42 152,60 160,55 168,60"
                  fill={isAlignedWithQibla ? '#34d399' : '#fbbf24'}
                />

                {/* Иконка Досточтимой Каабы на конце луча */}
                <g transform="translate(160, 27)">
                  <circle
                    cx="0"
                    cy="0"
                    r="13"
                    fill="#04271e"
                    stroke={isAlignedWithQibla ? '#34d399' : '#fbbf24'}
                    strokeWidth="2"
                  />
                  {/* Куб Каабы с золотым поясом (Кисва) */}
                  <rect
                    x="-6.5"
                    y="-6.5"
                    width="13"
                    height="13"
                    rx="1.5"
                    fill="#111827"
                    stroke="#fef3c7"
                    strokeWidth="0.8"
                  />
                  <line
                    x1="-6.5"
                    y1="-2.2"
                    x2="6.5"
                    y2="-2.2"
                    stroke="#fbbf24"
                    strokeWidth="2"
                  />
                </g>
              </g>
            </g>

            {/* Центральная ось компаса */}
            <circle
              cx="160"
              cy="160"
              r="28"
              fill="#04271e"
              stroke="rgba(254, 243, 199, 0.35)"
              strokeWidth="1.5"
            />
            <text
              x="160"
              y="157"
              textAnchor="middle"
              fill="#fef3c7"
              fontSize="11"
              fontFamily="monospace"
              fontWeight="700"
            >
              {qibla.azimuthDeg.toFixed(1)}°
            </text>
            <text
              x="160"
              y="170"
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="9.5"
              fontWeight="700"
            >
              {qibla.cardinalShortRu}
            </text>
          </svg>
        </div>

        {/* Статус наведения под компасом */}
        <div
          className={`mt-3 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 text-center ${
            isAlignedWithQibla
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-800 border border-slate-200'
          }`}
        >
          {isAlignedWithQibla ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <Compass className="w-4 h-4 text-[#06392c] shrink-0" />
          )}
          <span>{turnInstructionRu}</span>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ: УПРАВЛЕНИЕ ДАТЧИКОМ, ПОПРАВКА НА МАГНИТНОЕ СКЛОНЕНИЕ И ТЕСТ */}
      <div className="lg:col-span-5 space-y-3.5">
        <div className="rounded-2xl bg-white border border-slate-200/90 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-serif text-base font-bold text-slate-900">
                Живой компас смартфона
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Ориентир для локации: <strong className="text-slate-900">{locationLabel}</strong>
              </p>
            </div>
            <Smartphone className="w-5 h-5 text-[#06392c] shrink-0" />
          </div>

          {/* Кнопка включения живого компаса */}
          {!isSensorActive ? (
            <button
              type="button"
              onClick={handleStartLiveCompass}
              className="w-full py-2.5 px-4 rounded-xl bg-[#06392c] hover:bg-[#074938] text-[#fef3c7] text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Compass className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                {isIOSPermissionRequired
                  ? 'Включить живой компас (iPhone)'
                  : 'Включить живой компас'}
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
              <span>
                Датчик компаса активен
                {sensorAccuracyDeg !== null ? ` (±${sensorAccuracyDeg}°)` : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSensorStatus('idle');
                  setRawDeviceHeading(null);
                  setSmoothedHeading(0);
                  setContinuousDialRotation(0);
                }}
                className="text-emerald-800 underline font-semibold cursor-pointer"
              >
                Стоп
              </button>
            </div>
          )}

          {/* Сообщения, если датчик не поддерживается (например, на ПК) или запрещён */}
          {sensorStatus === 'unsupported' && (
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-3 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>На этом устройстве нет магнитного датчика компаса</span>
              </div>
              <p className="text-amber-900/90 leading-relaxed">
                Компас показывает точный угол <strong>{qibla.azimuthDeg.toFixed(1)}° ({qibla.cardinalShortRu})</strong> относительно Севера. Чтобы увидеть направление прямо по вашему дому и окнам квартиры, откройте вкладку{' '}
                <button
                  type="button"
                  onClick={onSwitchToMap}
                  className="font-bold underline text-[#06392c] cursor-pointer"
                >
                  «Яндекс.Карта по дому»
                </button>
                .
              </p>
            </div>
          )}

          {sensorStatus === 'denied' && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-900">
              Доступ к датчику ориентации отклонён браузером. Вы можете определить точное направление Киблы по вашему дому на вкладке{' '}
              <button
                type="button"
                onClick={onSwitchToMap}
                className="font-bold underline cursor-pointer"
              >
                «Яндекс.Карта по дому»
              </button>
              .
            </div>
          )}

          {/* Переключатель учёта магнитного склонения (+12.8° для Уфы) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useDeclinationCorrection}
                onChange={(e) => setUseDeclinationCorrection(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#06392c] focus:ring-[#06392c]"
              />
              <span className="text-xs text-slate-700 leading-snug">
                <strong className="text-slate-900">
                  Учитывать магнитное склонение ({qibla.declinationDeg >= 0 ? `+${qibla.declinationDeg}°` : `${qibla.declinationDeg}°`})
                </strong>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Приводит показания магнитного датчика Android к Истинному (географическому) Северу.
                </span>
              </span>
            </label>
          </div>

          {/* Ручной поворот компаса (удобно на ПК или для проверки угла в комнате) */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">
                Поворот шкалы вручную (для проверки):
              </span>
              {manualTestHeading !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setManualTestHeading(null);
                    if (!isSensorActive) {
                      setSmoothedHeading(0);
                      setContinuousDialRotation(0);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#06392c] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Сбросить (0°)
                </button>
              )}
            </div>
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(effectivePhoneHeading)}
              onChange={(e) => setManualTestHeading(Number(e.target.value))}
              className="w-full accent-[#06392c] cursor-pointer"
              aria-label="Ручной поворот компаса в градусах"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0° (С)</span>
              <span>90° (В)</span>
              <span>180° (Ю)</span>
              <span>206.5° (Кибла Уфа)</span>
              <span>270° (З)</span>
            </div>
          </div>
        </div>

        {/* Быстрый переход к проверке по Яндекс.Карте */}
        <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3.5 text-xs text-slate-700 space-y-2">
          <div className="font-bold text-slate-900">
            Совет для квартиры или мечети:
          </div>
          <p className="leading-relaxed">
            В железобетонных домах магнитный датчик телефона может отклоняться из-за арматуры, батарей и электропроводки. Проверьте направление по контуру вашего дома и окнам на Яндекс.Карте.
          </p>
          <button
            type="button"
            onClick={onSwitchToMap}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-[#06392c] font-bold text-xs transition cursor-pointer"
          >
            Открыть Яндекс.Карту с лучом Киблы →
          </button>
        </div>
      </div>
    </div>
  );
};
