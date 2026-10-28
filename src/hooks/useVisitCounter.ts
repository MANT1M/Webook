import { useState, useEffect, useRef, useCallback } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export const ONLINE_TIMEOUT_MS = 5 * 60 * 1000; // 5 минут в миллисекундах (300 000 мс)
const HEARTBEAT_THROTTLE_MS = 25 * 1000; // Не чаще раза в 25 секунд отправка в Firestore

export interface VisitStats {
  totalVisits: number;
  uniqueVisitors: number;
  dailyUniqueVisitors: number;
  dailyDate: string;
  onlineReaders: number;
  personalVisits: number;
  readingStreak: number;
  lastActionAt: number;
  secondsSinceLastAction: number;
  isCurrentUserOnline: boolean;
  loading: boolean;
  error: string | null;
  checkNow: () => void;
}

const STATS_PATH = 'app_stats';
const STATS_DOC_ID = 'global';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem('library_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('library_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_anon';
  }
}

function cleanActiveReadersMap(
  rawMap: unknown,
  now: number
): Record<string, number> {
  const cleaned: Record<string, number> = {};
  if (!rawMap || typeof rawMap !== 'object') return cleaned;

  const entries = Object.entries(rawMap as Record<string, unknown>);
  for (const [key, val] of entries) {
    if (typeof val === 'number' && now - val <= ONLINE_TIMEOUT_MS && val <= now + 60000) {
      cleaned[key] = val;
    }
  }

  // Ограничиваем размер карты до 450 записей (по правилам безопасности <= 500)
  const keys = Object.keys(cleaned);
  if (keys.length > 450) {
    keys
      .sort((a, b) => cleaned[b] - cleaned[a])
      .slice(450)
      .forEach((k) => delete cleaned[k]);
  }

  return cleaned;
}

export function useVisitCounter(): VisitStats {
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [uniqueVisitors, setUniqueVisitors] = useState<number>(0);
  const [dailyUniqueVisitors, setDailyUniqueVisitors] = useState<number>(1);
  const [dailyDate, setDailyDate] = useState<string>(getTodayDateString);
  const [onlineReaders, setOnlineReaders] = useState<number>(1);
  const [personalVisits, setPersonalVisits] = useState<number>(1);
  const [readingStreak, setReadingStreak] = useState<number>(1);
  const [lastActionAt, setLastActionAt] = useState<number>(() => Date.now());
  const [secondsSinceLastAction, setSecondsSinceLastAction] = useState<number>(0);
  const [isCurrentUserOnline, setIsCurrentUserOnline] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const lastActionRef = useRef<number>(Date.now());
  const lastFirestoreSyncRef = useRef<number>(0);
  const activeReadersRef = useRef<Record<string, number>>({});
  const deviceIdRef = useRef<string>(getOrCreateDeviceId());

  // Функция пересчёта онлайн-читателей по принципу: последнее действие <= 5 минут назад
  const recalculateOnlineState = useCallback(() => {
    const now = Date.now();
    const diffMs = Math.max(0, now - lastActionRef.current);
    const userOnline = diffMs <= ONLINE_TIMEOUT_MS;

    setSecondsSinceLastAction(Math.floor(diffMs / 1000));
    setIsCurrentUserOnline(userOnline);

    // Считаем всех читателей в карте activeReaders, чьё последнее действие было не более 5 минут назад
    const validMap = cleanActiveReadersMap(activeReadersRef.current, now);
    if (userOnline) {
      validMap[deviceIdRef.current] = lastActionRef.current;
    } else {
      delete validMap[deviceIdRef.current];
    }

    const count = Object.keys(validMap).length;
    setOnlineReaders(count);
  }, []);

  // Синхронизация активности текущего читателя с Firestore
  const syncActivityToFirestore = useCallback(async (actionTimestamp: number, force = false) => {
    const now = Date.now();
    if (!force && now - lastFirestoreSyncRef.current < HEARTBEAT_THROTTLE_MS) {
      return;
    }
    lastFirestoreSyncRef.current = now;

    try {
      const statsDocRef = doc(db, STATS_PATH, STATS_DOC_ID);
      const cleaned = cleanActiveReadersMap(activeReadersRef.current, now);
      cleaned[deviceIdRef.current] = actionTimestamp;
      activeReadersRef.current = cleaned;

      await updateDoc(statsDocRef, {
        activeReaders: cleaned,
        lastUpdated: new Date(now).toISOString(),
      });
    } catch {
      // Игнорируем фоновые ошибки синхронизации пульса
    }
  }, []);

  useEffect(() => {
    const today = getTodayDateString();

    // 1. Обновление персональной статистики в localStorage
    try {
      const sessionAlreadyCounted = sessionStorage.getItem('library_session_counted');
      const savedPersonalVisits = parseInt(
        localStorage.getItem('library_personal_visits') || '0',
        10
      );
      const lastVisitDate = localStorage.getItem('library_last_visit_date');
      const savedStreak = parseInt(
        localStorage.getItem('library_reading_streak') || '1',
        10
      );

      let newStreak = savedStreak;
      if (lastVisitDate) {
        const lastDate = new Date(lastVisitDate);
        const currDate = new Date(today);
        const diffDays = Math.round(
          (currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          newStreak = savedStreak + 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      let nextPersonal = savedPersonalVisits;
      if (!sessionAlreadyCounted) {
        nextPersonal = savedPersonalVisits + 1;
        localStorage.setItem('library_personal_visits', String(nextPersonal));
      } else if (nextPersonal === 0) {
        nextPersonal = 1;
        localStorage.setItem('library_personal_visits', '1');
      }

      setPersonalVisits(nextPersonal);
      setReadingStreak(newStreak);

      localStorage.setItem('library_last_visit_date', today);
      localStorage.setItem('library_reading_streak', String(newStreak));
    } catch {
      // Игнорируем ошибки доступа к storage
    }

    // 2. Инициализация и инкремент в Firebase Firestore (общие, дневные уникальные и онлайн)
    const statsDocRef = doc(db, STATS_PATH, STATS_DOC_ID);

    const recordVisitAndActivity = async () => {
      try {
        const now = Date.now();
        const sessionCounted = sessionStorage.getItem('library_session_counted');
        const everCountedVisitor = localStorage.getItem('library_visitor_counted') === 'true';
        const lastDailyCountedDate = localStorage.getItem('library_daily_unique_date');
        const isNewDailyVisitor = lastDailyCountedDate !== today;
        const deviceId = deviceIdRef.current;

        const snap = await getDoc(statsDocRef).catch((err) => {
          handleFirestoreError(err, OperationType.GET, `${STATS_PATH}/${STATS_DOC_ID}`);
        });

        if (!snap || !snap.exists()) {
          const initialActive: Record<string, number> = { [deviceId]: now };
          activeReadersRef.current = initialActive;
          lastFirestoreSyncRef.current = now;

          await setDoc(statsDocRef, {
            totalVisits: 1,
            uniqueVisitors: 1,
            dailyDate: today,
            dailyUniqueVisitors: 1,
            activeReaders: initialActive,
            lastUpdated: new Date(now).toISOString(),
          }).catch((err) => {
            handleFirestoreError(err, OperationType.CREATE, `${STATS_PATH}/${STATS_DOC_ID}`);
          });

          sessionStorage.setItem('library_session_counted', 'true');
          localStorage.setItem('library_visitor_counted', 'true');
          localStorage.setItem('library_daily_unique_date', today);
        } else {
          const data = snap.data();
          const cleanedActive = cleanActiveReadersMap(data.activeReaders, now);
          cleanedActive[deviceId] = now;
          activeReadersRef.current = cleanedActive;
          lastFirestoreSyncRef.current = now;

          const updates: Record<string, unknown> = {
            activeReaders: cleanedActive,
            lastUpdated: new Date(now).toISOString(),
          };

          if (!sessionCounted) {
            updates.totalVisits = increment(1);
            sessionStorage.setItem('library_session_counted', 'true');
          }

          if (!everCountedVisitor) {
            updates.uniqueVisitors = increment(1);
            localStorage.setItem('library_visitor_counted', 'true');
          }

          // Учёт уникальных читателей за день
          if (data.dailyDate !== today) {
            updates.dailyDate = today;
            updates.dailyUniqueVisitors = 1;
            localStorage.setItem('library_daily_unique_date', today);
          } else if (isNewDailyVisitor) {
            const currentDaily =
              typeof data.dailyUniqueVisitors === 'number' ? data.dailyUniqueVisitors : 0;
            updates.dailyUniqueVisitors = currentDaily + 1;
            localStorage.setItem('library_daily_unique_date', today);
          } else if (typeof data.dailyUniqueVisitors !== 'number' || data.dailyUniqueVisitors < 1) {
            updates.dailyUniqueVisitors = 1;
          }

          await updateDoc(statsDocRef, updates).catch((err) => {
            handleFirestoreError(err, OperationType.UPDATE, `${STATS_PATH}/${STATS_DOC_ID}`);
          });
        }
      } catch (err) {
        console.warn('Не удалось зафиксировать визит в Firebase:', err);
        setError(err instanceof Error ? err.message : 'Ошибка счетчика');
      }
    };

    recordVisitAndActivity();

    // 3. Подписка в реальном времени на счётчик через onSnapshot
    const unsubscribe = onSnapshot(
      statsDocRef,
      (docSnap) => {
        setLoading(false);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.totalVisits === 'number') {
            setTotalVisits(data.totalVisits);
          }
          if (typeof data.uniqueVisitors === 'number') {
            setUniqueVisitors(data.uniqueVisitors);
          }

          const currentDay = getTodayDateString();
          if (typeof data.dailyDate === 'string') {
            setDailyDate(data.dailyDate);
          }
          if (data.dailyDate === currentDay && typeof data.dailyUniqueVisitors === 'number') {
            setDailyUniqueVisitors(Math.max(1, data.dailyUniqueVisitors));
          } else if (data.dailyDate && data.dailyDate !== currentDay) {
            setDailyUniqueVisitors(1);
          }

          if (data.activeReaders && typeof data.activeReaders === 'object') {
            activeReadersRef.current = cleanActiveReadersMap(data.activeReaders, Date.now());
          }
          recalculateOnlineState();
        }
      },
      (err) => {
        setLoading(false);
        setError(err.message);
        handleFirestoreError(err, OperationType.GET, `${STATS_PATH}/${STATS_DOC_ID}`);
      }
    );

    return () => unsubscribe();
  }, [recalculateOnlineState]);

  // 4. Отслеживание действий пользователя (последнее действие <= 5 минут назад -> онлайн)
  useEffect(() => {
    let lastUiUpdate = 0;

    const handleUserActivity = (event: Event) => {
      // Если клик внутри окна проверки статистики со специальным атрибутом, не сбрасываем таймер бездействия
      const target = event.target as HTMLElement | null;
      if (target && target.closest('[data-ignore-activity="true"]')) {
        return;
      }

      const now = Date.now();
      const wasOffline = now - lastActionRef.current > ONLINE_TIMEOUT_MS;
      lastActionRef.current = now;

      if (wasOffline || now - lastUiUpdate > 2000) {
        lastUiUpdate = now;
        setLastActionAt(now);
        recalculateOnlineState();
      }

      // Отправляем обновление активности в Firestore (с троттлингом или сразу после выхода из оффлайна)
      syncActivityToFirestore(now, wasOffline);
    };

    const events: Array<keyof WindowEventMap> = [
      'pointerdown',
      'keydown',
      'scroll',
      'touchstart',
      'mousemove',
      'click',
    ];

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true, capture: true });
    });

    // Периодическая проверка каждые 5 секунд: если активности нет > 5 минут, читатель становится не онлайн
    const intervalId = window.setInterval(() => {
      recalculateOnlineState();
    }, 5000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity, { capture: true });
      });
      window.clearInterval(intervalId);
    };
  }, [recalculateOnlineState, syncActivityToFirestore]);

  return {
    totalVisits,
    uniqueVisitors,
    dailyUniqueVisitors,
    dailyDate,
    onlineReaders,
    personalVisits,
    readingStreak,
    lastActionAt,
    secondsSinceLastAction,
    isCurrentUserOnline,
    loading,
    error,
    checkNow: recalculateOnlineState,
  };
}
