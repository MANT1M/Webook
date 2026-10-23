import { useState, useEffect, useCallback } from 'react';
import {
  ThemeMode,
  ChapterProgress,
  ReaderPersistedState,
} from '../types/reader';
import { READER_LIMITS } from '../constants/theme';
import { EASY_GOOD_DEEDS_BOOK } from '../data/easyGoodDeedsData';

export const STORAGE_KEY = 'ir_web_reader_v3';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createDefaultProgress(): Record<number, ChapterProgress> {
  const initialProgress: Record<number, ChapterProgress> = {};
  for (const chapter of EASY_GOOD_DEEDS_BOOK.chapters) {
    initialProgress[chapter.id] = {
      status: 'AVAILABLE',
      offset: 0,
      bestScore: 0,
    };
  }
  return initialProgress;
}

function normalizeProgress(
  savedProgress?: Record<number, Partial<ChapterProgress>>
): Record<number, ChapterProgress> {
  const normalized = createDefaultProgress();

  if (!savedProgress || typeof savedProgress !== 'object') {
    return normalized;
  }

  for (const [key, value] of Object.entries(savedProgress)) {
    const chapterId = Number(key);
    if (Number.isNaN(chapterId) || !value || typeof value !== 'object') {
      continue;
    }

    normalized[chapterId] = {
      status: value.status === 'PASSED' ? 'PASSED' : 'AVAILABLE',
      offset:
        typeof value.offset === 'number' && value.offset >= 0
          ? Math.floor(value.offset)
          : 0,
      bestScore:
        typeof value.bestScore === 'number'
          ? clamp(Math.round(value.bestScore), 0, 100)
          : 0,
    };
  }

  return normalized;
}

function loadInitialState(): ReaderPersistedState {
  const fallback: ReaderPersistedState = {
    theme: 'LIGHT',
    fontSize: READER_LIMITS.FONT_SIZE_DEFAULT,
    arabicScale: READER_LIMITS.ARABIC_SCALE_DEFAULT,
    progress: createDefaultProgress(),
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<ReaderPersistedState>;

    const theme: ThemeMode =
      parsed.theme === 'LIGHT' ||
      parsed.theme === 'SEPIA' ||
      parsed.theme === 'NIGHT'
        ? parsed.theme
        : 'LIGHT';

    const fontSize =
      typeof parsed.fontSize === 'number'
        ? clamp(
            parsed.fontSize,
            READER_LIMITS.FONT_SIZE_MIN,
            READER_LIMITS.FONT_SIZE_MAX
          )
        : READER_LIMITS.FONT_SIZE_DEFAULT;

    const arabicScale =
      typeof parsed.arabicScale === 'number'
        ? Number(
            clamp(
              parsed.arabicScale,
              READER_LIMITS.ARABIC_SCALE_MIN,
              READER_LIMITS.ARABIC_SCALE_MAX
            ).toFixed(2)
          )
        : READER_LIMITS.ARABIC_SCALE_DEFAULT;

    const progress = normalizeProgress(parsed.progress);

    return {
      theme,
      fontSize,
      arabicScale,
      progress,
    };
  } catch {
    return fallback;
  }
}

export function useReaderState() {
  const [state, setState] = useState<ReaderPersistedState>(loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota or private mode errors
    }
  }, [state]);

  const setTheme = useCallback((theme: ThemeMode) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    const clamped = clamp(
      fontSize,
      READER_LIMITS.FONT_SIZE_MIN,
      READER_LIMITS.FONT_SIZE_MAX
    );
    setState((prev) => ({ ...prev, fontSize: clamped }));
  }, []);

  const setArabicScale = useCallback((arabicScale: number) => {
    const clamped = Number(
      clamp(
        arabicScale,
        READER_LIMITS.ARABIC_SCALE_MIN,
        READER_LIMITS.ARABIC_SCALE_MAX
      ).toFixed(2)
    );
    setState((prev) => ({ ...prev, arabicScale: clamped }));
  }, []);

  const updateChapterOffset = useCallback((chapterId: number, offset: number) => {
    const safeOffset = Math.max(0, Math.floor(offset));
    setState((prev) => {
      const current: ChapterProgress = prev.progress[chapterId] ?? {
        status: 'AVAILABLE',
        offset: 0,
        bestScore: 0,
      };

      return {
        ...prev,
        progress: {
          ...prev.progress,
          [chapterId]: {
            ...current,
            status: current.status === 'PASSED' ? 'PASSED' : 'AVAILABLE',
            offset: safeOffset,
          },
        },
      };
    });
  }, []);

  const recordQuizResult = useCallback(
    (chapterId: number, score: number, passed: boolean) => {
      const normalizedScore = clamp(Math.round(score), 0, 100);
      setState((prev) => {
        const current: ChapterProgress = prev.progress[chapterId] ?? {
          status: 'AVAILABLE',
          offset: 0,
          bestScore: 0,
        };

        const nextBestScore = Math.max(current.bestScore, normalizedScore);
        const nextStatus =
          current.status === 'PASSED' || passed ? 'PASSED' : 'AVAILABLE';

        return {
          ...prev,
          progress: {
            ...prev.progress,
            [chapterId]: {
              ...current,
              bestScore: nextBestScore,
              status: nextStatus,
            },
          },
        };
      });
    },
    []
  );

  const getChapterProgress = useCallback(
    (chapterId: number): ChapterProgress => {
      return (
        state.progress[chapterId] ?? {
          status: 'AVAILABLE',
          offset: 0,
          bestScore: 0,
        }
      );
    },
    [state.progress]
  );

  const exportStateJson = useCallback((): string => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importStateJson = useCallback(
    (jsonString: string): boolean => {
      try {
        const parsed = JSON.parse(jsonString) as Partial<ReaderPersistedState>;
        if (!parsed || typeof parsed !== 'object') return false;
        const theme: ThemeMode =
          parsed.theme === 'LIGHT' ||
          parsed.theme === 'SEPIA' ||
          parsed.theme === 'NIGHT'
            ? parsed.theme
            : state.theme;
        const fontSize =
          typeof parsed.fontSize === 'number'
            ? clamp(
                parsed.fontSize,
                READER_LIMITS.FONT_SIZE_MIN,
                READER_LIMITS.FONT_SIZE_MAX
              )
            : state.fontSize;
        const arabicScale =
          typeof parsed.arabicScale === 'number'
            ? Number(
                clamp(
                  parsed.arabicScale,
                  READER_LIMITS.ARABIC_SCALE_MIN,
                  READER_LIMITS.ARABIC_SCALE_MAX
                ).toFixed(2)
              )
            : state.arabicScale;
        const progress = normalizeProgress(parsed.progress);
        setState({ theme, fontSize, arabicScale, progress });
        return true;
      } catch {
        return false;
      }
    },
    [state.theme, state.fontSize, state.arabicScale]
  );

  return {
    theme: state.theme,
    fontSize: state.fontSize,
    arabicScale: state.arabicScale,
    progress: state.progress,
    setTheme,
    setFontSize,
    setArabicScale,
    updateChapterOffset,
    recordQuizResult,
    getChapterProgress,
    exportStateJson,
    importStateJson,
  };
}
