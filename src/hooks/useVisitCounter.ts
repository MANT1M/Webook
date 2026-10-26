import { useState, useEffect } from 'react';
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  increment,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface VisitStats {
  totalVisits: number;
  uniqueVisitors: number;
  personalVisits: number;
  readingStreak: number;
  loading: boolean;
  error: string | null;
}

const STATS_PATH = 'app_stats';
const STATS_DOC_ID = 'global';

export function useVisitCounter(): VisitStats {
  const [totalVisits, setTotalVisits] = useState<number>(0);
  const [uniqueVisitors, setUniqueVisitors] = useState<number>(0);
  const [personalVisits, setPersonalVisits] = useState<number>(1);
  const [readingStreak, setReadingStreak] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Обновление персональной статистики в localStorage
    try {
      const today = new Date().toISOString().slice(0, 10);
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

      const nextPersonal = savedPersonalVisits + 1;
      setPersonalVisits(nextPersonal);
      setReadingStreak(newStreak);

      localStorage.setItem('library_personal_visits', String(nextPersonal));
      localStorage.setItem('library_last_visit_date', today);
      localStorage.setItem('library_reading_streak', String(newStreak));
    } catch {
      // Игнорируем ошибки доступа к storage в приватном режиме
    }

    // 2. Инициализация и инкремент в облачной базе Firebase Firestore
    const statsDocRef = doc(db, STATS_PATH, STATS_DOC_ID);

    const recordVisit = async () => {
      try {
        const sessionCounted = sessionStorage.getItem('library_session_counted');
        const hasDeviceId = localStorage.getItem('library_device_id');
        const isNewVisitor = !hasDeviceId;

        if (!hasDeviceId) {
          localStorage.setItem(
            'library_device_id',
            'dev_' + Math.random().toString(36).substring(2, 12)
          );
        }

        // Если в этой сессии визит ещё не засчитан
        if (!sessionCounted) {
          sessionStorage.setItem('library_session_counted', 'true');

          const snap = await getDoc(statsDocRef).catch((err) => {
            handleFirestoreError(err, OperationType.GET, `${STATS_PATH}/${STATS_DOC_ID}`);
          });

          if (!snap.exists()) {
            // Первый запуск: создаём начальный документ
            await setDoc(statsDocRef, {
              totalVisits: 1,
              uniqueVisitors: 1,
              lastUpdated: new Date().toISOString(),
            }).catch((err) => {
              handleFirestoreError(err, OperationType.CREATE, `${STATS_PATH}/${STATS_DOC_ID}`);
            });
          } else {
            // Инкрементируем общее число визитов и при необходимости уникальных
            const updates: Record<string, unknown> = {
              totalVisits: increment(1),
              lastUpdated: new Date().toISOString(),
            };
            if (isNewVisitor) {
              updates.uniqueVisitors = increment(1);
            }

            await updateDoc(statsDocRef, updates).catch((err) => {
              handleFirestoreError(err, OperationType.UPDATE, `${STATS_PATH}/${STATS_DOC_ID}`);
            });
          }
        }
      } catch (err) {
        console.warn('Не удалось зафиксировать визит в Firebase:', err);
        setError(err instanceof Error ? err.message : 'Ошибка счетчика');
      }
    };

    recordVisit();

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
        }
      },
      (err) => {
        setLoading(false);
        setError(err.message);
        handleFirestoreError(err, OperationType.GET, `${STATS_PATH}/${STATS_DOC_ID}`);
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    totalVisits,
    uniqueVisitors,
    personalVisits,
    readingStreak,
    loading,
    error,
  };
}
