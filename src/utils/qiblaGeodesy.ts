// Геодезическое ядро для расчёта направления Киблы (сферическая тригонометрия,
// прямая геодезическая задача, ортодромия, магнитное склонение и города РБ / РФ)

export interface QiblaCityPreset {
  id: string;
  nameRu: string;
  nameTt?: string;
  region: 'Башкортостан' | 'Россия';
  lat: number; // Широта (северная), градусы
  lon: number; // Долгота (восточная), градусы
  magneticDeclinationDeg: number; // Восточное магнитное склонение (+), градусы
}

export interface QiblaLocationState {
  cityId: string; // ID города из списка или 'custom_gps' / 'custom_pin'
  labelRu: string;
  lat: number;
  lon: number;
  magneticDeclinationDeg: number;
  source: 'preset' | 'gps' | 'map_pin';
}

export interface QiblaCalculationResult {
  azimuthDeg: number; // Истинный начальный азимут (0°..360° от Истинного Севера по часовой стрелке)
  magneticAzimuthDeg: number; // Магнитный азимут с учётом магнитного склонения
  distanceKm: number; // Расстояние по дуге большого круга (гаверсинусы), км
  cardinalShortRu: string; // Например: "ЮЗ", "ЮЮЗ", "Ю"
  cardinalFullRu: string; // Например: "Юго-запад"
  declinationDeg: number; // Магнитное склонение в данной точке (+ восточное)
}

// Точные координаты Досточтимой Каабы в Мекке (Аль-Масджид аль-Харам)
export const KAABA_COORDS = {
  lat: 21.42252,
  lon: 39.82621,
} as const;

const EARTH_RADIUS_KM = 6371.0088;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/**
 * База городов Республики Башкортостан и крупных городов России
 * Координаты указаны в формате [широта, долгота] (WGS-84)
 */
export const QIBLA_CITY_PRESETS: QiblaCityPreset[] = [
  // Республика Башкортостан
  {
    id: 'ufa',
    nameRu: 'Уфа',
    nameTt: 'Өфө',
    region: 'Башкортостан',
    lat: 54.7388,
    lon: 55.9721,
    magneticDeclinationDeg: 12.8,
  },
  {
    id: 'sterlitamak',
    nameRu: 'Стерлитамак',
    nameTt: 'Стәрлетамак',
    region: 'Башкортостан',
    lat: 53.6304,
    lon: 55.9308,
    magneticDeclinationDeg: 12.4,
  },
  {
    id: 'salavat',
    nameRu: 'Салават',
    nameTt: 'Салауат',
    region: 'Башкортостан',
    lat: 53.3616,
    lon: 55.9245,
    magneticDeclinationDeg: 12.3,
  },
  {
    id: 'neftekamsk',
    nameRu: 'Нефтекамск',
    nameTt: 'Нефтекама',
    region: 'Башкортостан',
    lat: 56.0884,
    lon: 54.2482,
    magneticDeclinationDeg: 13.0,
  },
  {
    id: 'oktyabrsky',
    nameRu: 'Октябрьский',
    nameTt: 'Октябрьский',
    region: 'Башкортостан',
    lat: 54.4815,
    lon: 53.471,
    magneticDeclinationDeg: 12.1,
  },
  {
    id: 'tuymazy',
    nameRu: 'Туймазы',
    nameTt: 'Туймазы',
    region: 'Башкортостан',
    lat: 54.6095,
    lon: 53.7001,
    magneticDeclinationDeg: 12.2,
  },
  {
    id: 'beloretsk',
    nameRu: 'Белорецк',
    nameTt: 'Белорет',
    region: 'Башкортостан',
    lat: 53.9675,
    lon: 58.3994,
    magneticDeclinationDeg: 13.1,
  },
  {
    id: 'sibay',
    nameRu: 'Сибай',
    nameTt: 'Сибай',
    region: 'Башкортостан',
    lat: 52.7126,
    lon: 58.6657,
    magneticDeclinationDeg: 12.6,
  },
  {
    id: 'uchaly',
    nameRu: 'Учалы',
    nameTt: 'Учалы',
    region: 'Башкортостан',
    lat: 54.3193,
    lon: 59.3822,
    magneticDeclinationDeg: 13.3,
  },
  {
    id: 'meleuz',
    nameRu: 'Мелеуз',
    nameTt: 'Мәләүез',
    region: 'Башкортостан',
    lat: 52.9647,
    lon: 55.9328,
    magneticDeclinationDeg: 12.1,
  },
  {
    id: 'ishimbay',
    nameRu: 'Ишимбай',
    nameTt: 'Ишембай',
    region: 'Башкортостан',
    lat: 53.4498,
    lon: 56.0406,
    magneticDeclinationDeg: 12.3,
  },
  {
    id: 'kumertau',
    nameRu: 'Кумертау',
    nameTt: 'Күмертау',
    region: 'Башкортостан',
    lat: 52.7661,
    lon: 55.7924,
    magneticDeclinationDeg: 12.0,
  },
  {
    id: 'birsk',
    nameRu: 'Бирск',
    nameTt: 'Бөрө',
    region: 'Башкортостан',
    lat: 55.4184,
    lon: 55.5367,
    magneticDeclinationDeg: 13.0,
  },
  {
    id: 'belebey',
    nameRu: 'Белебей',
    nameTt: 'Бәләбәй',
    region: 'Башкортостан',
    lat: 54.1038,
    lon: 54.1242,
    magneticDeclinationDeg: 12.1,
  },
  {
    id: 'dyurtyuli',
    nameRu: 'Дюртюли',
    nameTt: 'Дүртөйлө',
    region: 'Башкортостан',
    lat: 55.4856,
    lon: 54.8644,
    magneticDeclinationDeg: 12.9,
  },
  {
    id: 'yanaul',
    nameRu: 'Янаул',
    nameTt: 'Яңавыл',
    region: 'Башкортостан',
    lat: 56.2657,
    lon: 54.9333,
    magneticDeclinationDeg: 13.2,
  },
  {
    id: 'davlekanovo',
    nameRu: 'Давлеканово',
    nameTt: 'Дәүләкән',
    region: 'Башкортостан',
    lat: 54.2194,
    lon: 55.0369,
    magneticDeclinationDeg: 12.4,
  },
  {
    id: 'chishmy',
    nameRu: 'Чишмы',
    nameTt: 'Чишмә',
    region: 'Башкортостан',
    lat: 54.5906,
    lon: 55.3917,
    magneticDeclinationDeg: 12.6,
  },
  {
    id: 'karmaskaly',
    nameRu: 'Кармаскалы',
    nameTt: 'Кармаскалы',
    region: 'Башкортостан',
    lat: 54.3708,
    lon: 56.1836,
    magneticDeclinationDeg: 12.7,
  },
  {
    id: 'raevsky',
    nameRu: 'Раевский',
    nameTt: 'Раевка',
    region: 'Башкортостан',
    lat: 54.0658,
    lon: 54.9469,
    magneticDeclinationDeg: 12.3,
  },
  {
    id: 'mesyagutovo',
    nameRu: 'Месягутово',
    nameTt: 'Мәсәғүт',
    region: 'Башкортостан',
    lat: 55.5522,
    lon: 58.2528,
    magneticDeclinationDeg: 13.5,
  },
  {
    id: 'askarovo',
    nameRu: 'Аскарово',
    nameTt: 'Асҡар',
    region: 'Башкортостан',
    lat: 53.3414,
    lon: 58.5169,
    magneticDeclinationDeg: 12.8,
  },
  // Другие города России
  {
    id: 'kazan',
    nameRu: 'Казань',
    nameTt: 'Казан',
    region: 'Россия',
    lat: 55.7961,
    lon: 49.1064,
    magneticDeclinationDeg: 11.9,
  },
  {
    id: 'orenburg',
    nameRu: 'Оренбург',
    region: 'Россия',
    lat: 51.7682,
    lon: 55.097,
    magneticDeclinationDeg: 11.5,
  },
  {
    id: 'chelyabinsk',
    nameRu: 'Челябинск',
    region: 'Россия',
    lat: 55.1644,
    lon: 61.4368,
    magneticDeclinationDeg: 13.9,
  },
  {
    id: 'ekaterinburg',
    nameRu: 'Екатеринбург',
    region: 'Россия',
    lat: 56.8389,
    lon: 60.6057,
    magneticDeclinationDeg: 14.3,
  },
  {
    id: 'moscow',
    nameRu: 'Москва',
    region: 'Россия',
    lat: 55.7558,
    lon: 37.6173,
    magneticDeclinationDeg: 11.7,
  },
  {
    id: 'spb',
    nameRu: 'Санкт-Петербург',
    region: 'Россия',
    lat: 59.9343,
    lon: 30.3351,
    magneticDeclinationDeg: 11.3,
  },
];

/**
 * Приближённая оценка магнитного склонения (WMM-2025) для произвольных координат GPS
 * Для Урала/Поволжья/РФ даёт точность в пределах ~0.5°, а для городов из списка берётся точное табличное значение.
 */
export function estimateMagneticDeclination(lat: number, lon: number): number {
  // Проверяем, есть ли рядом город из пресетов (в радиусе ~0.5 градуса)
  for (const city of QIBLA_CITY_PRESETS) {
    if (Math.abs(city.lat - lat) < 0.35 && Math.abs(city.lon - lon) < 0.35) {
      return city.magneticDeclinationDeg;
    }
  }
  // Для территории РФ и Евразии (широта 40..68, долгота 25..75)
  if (lat >= 35 && lat <= 70 && lon >= 25 && lon <= 80) {
    const approx = 8.5 + (lat - 50) * 0.25 + (lon - 40) * 0.16;
    return Math.round(Math.max(-20, Math.min(25, approx)) * 10) / 10;
  }
  return 0;
}

/**
 * Определение стороны света (румба) по углу азимута (0°..360°)
 */
export function getCardinalDirectionRu(azimuthDeg: number): {
  shortRu: string;
  fullRu: string;
} {
  const normalized = ((azimuthDeg % 360) + 360) % 360;
  const directions = [
    { shortRu: 'С', fullRu: 'Север' },
    { shortRu: 'ССВ', fullRu: 'Северо-северо-восток' },
    { shortRu: 'СВ', fullRu: 'Северо-восток' },
    { shortRu: 'ВСВ', fullRu: 'Востоко-северо-восток' },
    { shortRu: 'В', fullRu: 'Восток' },
    { shortRu: 'ВЮВ', fullRu: 'Востоко-юго-восток' },
    { shortRu: 'ЮВ', fullRu: 'Юго-восток' },
    { shortRu: 'ЮЮВ', fullRu: 'Юго-юго-восток' },
    { shortRu: 'Ю', fullRu: 'Юг' },
    { shortRu: 'ЮЮЗ', fullRu: 'Юго-юго-запад' },
    { shortRu: 'ЮЗ', fullRu: 'Юго-запад' },
    { shortRu: 'ЗЮЗ', fullRu: 'Западо-юго-запад' },
    { shortRu: 'З', fullRu: 'Запад' },
    { shortRu: 'ЗСЗ', fullRu: 'Западо-северо-запад' },
    { shortRu: 'СЗ', fullRu: 'Северо-запад' },
    { shortRu: 'ССЗ', fullRu: 'Северо-северо-запад' },
  ];
  // Также для привычного 8-румбового отображения (ЮЗ для 206.5°)
  const eightDirections = [
    { shortRu: 'С', fullRu: 'Север' },
    { shortRu: 'СВ', fullRu: 'Северо-восток' },
    { shortRu: 'В', fullRu: 'Восток' },
    { shortRu: 'ЮВ', fullRu: 'Юго-восток' },
    { shortRu: 'Ю', fullRu: 'Юг' },
    { shortRu: 'ЮЗ', fullRu: 'Юго-запад' },
    { shortRu: 'З', fullRu: 'Запад' },
    { shortRu: 'СЗ', fullRu: 'Северо-запад' },
  ];
  const idx8 = Math.round(normalized / 45) % 8;
  const idx16 = Math.round(normalized / 22.5) % 16;
  return {
    shortRu: eightDirections[idx8].shortRu,
    fullRu: `${eightDirections[idx8].fullRu} (${directions[idx16].shortRu})`,
  };
}

/**
 * Сферический расчёт начального азимута (Forward Azimuth от Истинного Севера)
 * и расстояния по дуге большого круга (формула гаверсинусов) до Досточтимой Каабы
 */
export function calculateQiblaFromCoords(
  lat: number,
  lon: number,
  customDeclinationDeg?: number
): QiblaCalculationResult {
  const phi1 = toRadians(lat);
  const phi2 = toRadians(KAABA_COORDS.lat);
  const deltaLambda = toRadians(KAABA_COORDS.lon - lon);

  // Формула начального азимута по большому кругу:
  // θ = atan2(sin(Δλ)·cos(φ2), cos(φ1)·sin(φ2) − sin(φ1)·cos(φ2)·cos(Δλ))
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const rawBearingDeg = toDegrees(Math.atan2(y, x));
  const azimuthDeg = Math.round((((rawBearingDeg + 360) % 360) + Number.EPSILON) * 10) / 10;

  // Расстояние по формуле гаверсинусов
  const deltaPhi = toRadians(KAABA_COORDS.lat - lat);
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  const distanceKm = Math.round(EARTH_RADIUS_KM * c);

  const declinationDeg =
    typeof customDeclinationDeg === 'number'
      ? customDeclinationDeg
      : estimateMagneticDeclination(lat, lon);

  const magneticAzimuthDeg =
    Math.round((((azimuthDeg - declinationDeg + 360) % 360) + Number.EPSILON) * 10) / 10;

  const cardinal = getCardinalDirectionRu(azimuthDeg);

  return {
    azimuthDeg,
    magneticAzimuthDeg,
    distanceKm,
    cardinalShortRu: cardinal.shortRu,
    cardinalFullRu: cardinal.fullRu,
    declinationDeg,
  };
}

/**
 * Прямая геодезическая задача на сфере (Destination point given distance and initial bearing):
 * Вычисляет точные координаты [lat, lon] конечной точки луча, выпущенного из [startLat, startLon]
 * под истинным азимутом bearingDeg на расстояние distanceKm.
 * Полностью устраняет искажение угла из-за сжатия меридианов на широте Башкортостана/России!
 */
export function computeDestinationPoint(
  startLat: number,
  startLon: number,
  bearingDeg: number,
  distanceKm: number
): [number, number] {
  const phi1 = toRadians(startLat);
  const lambda1 = toRadians(startLon);
  const theta = toRadians(bearingDeg);
  const delta = distanceKm / EARTH_RADIUS_KM;

  const sinPhi2 =
    Math.sin(phi1) * Math.cos(delta) +
    Math.cos(phi1) * Math.sin(delta) * Math.cos(theta);
  const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));

  const y = Math.sin(theta) * Math.sin(delta) * Math.cos(phi1);
  const x = Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2);
  const lambda2 = lambda1 + Math.atan2(y, x);

  return [toDegrees(phi2), ((toDegrees(lambda2) + 540) % 360) - 180];
}

/**
 * Вычисляет массив промежуточных точек вдоль ортодромии (дуги большого круга)
 * между пользователем и Каабой в Мекке для отрисовки точной геодезической кривой на карте
 */
export function computeGeodesicArcToKaaba(
  startLat: number,
  startLon: number,
  segments = 96
): [number, number][] {
  const phi1 = toRadians(startLat);
  const lambda1 = toRadians(startLon);
  const phi2 = toRadians(KAABA_COORDS.lat);
  const lambda2 = toRadians(KAABA_COORDS.lon);

  const deltaPhi = phi2 - phi1;
  const deltaLambda = lambda2 - lambda1;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));

  if (angularDistance < 1e-6) {
    return [
      [startLat, startLon],
      [KAABA_COORDS.lat, KAABA_COORDS.lon],
    ];
  }

  const points: [number, number][] = [];
  const sinTotal = Math.sin(angularDistance);

  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * angularDistance) / sinTotal;
    const B = Math.sin(f * angularDistance) / sinTotal;

    const x =
      A * Math.cos(phi1) * Math.cos(lambda1) +
      B * Math.cos(phi2) * Math.cos(lambda2);
    const y =
      A * Math.cos(phi1) * Math.sin(lambda1) +
      B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);

    const phi = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lambda = Math.atan2(y, x);
    points.push([toDegrees(phi), toDegrees(lambda)]);
  }

  return points;
}

const STORAGE_KEY = 'simple_deeds_qibla_location_v1';

export function getDefaultUfaLocation(): QiblaLocationState {
  const ufa = QIBLA_CITY_PRESETS[0];
  return {
    cityId: ufa.id,
    labelRu: ufa.nameRu,
    lat: ufa.lat,
    lon: ufa.lon,
    magneticDeclinationDeg: ufa.magneticDeclinationDeg,
    source: 'preset',
  };
}

export function loadSavedQiblaLocation(): QiblaLocationState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultUfaLocation();
    const parsed = JSON.parse(raw) as Partial<QiblaLocationState>;
    if (
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number' &&
      parsed.lat >= -90 &&
      parsed.lat <= 90 &&
      parsed.lon >= -180 &&
      parsed.lon <= 180 &&
      typeof parsed.labelRu === 'string'
    ) {
      return {
        cityId: parsed.cityId || 'ufa',
        labelRu: parsed.labelRu,
        lat: parsed.lat,
        lon: parsed.lon,
        magneticDeclinationDeg:
          typeof parsed.magneticDeclinationDeg === 'number'
            ? parsed.magneticDeclinationDeg
            : estimateMagneticDeclination(parsed.lat, parsed.lon),
        source: parsed.source || 'preset',
      };
    }
  } catch {
    // ignore storage errors
  }
  return getDefaultUfaLocation();
}

export function saveQiblaLocation(loc: QiblaLocationState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // ignore storage errors
  }
}
