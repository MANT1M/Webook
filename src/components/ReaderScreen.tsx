import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChapterData, ThemeMode } from '../types/reader';
import { BRAND_COLORS, THEMES } from '../constants/theme';
import { paginate, findPageIndexByOffset } from '../utils/pagination';
import { formatReaderPageContent } from '../utils/arabicFormatter';
import { CustomScrollbar } from './CustomScrollbar';
import { FootnotePopup } from './FootnotePopup';
import { SettingsSheet } from './SettingsSheet';
import { QuizOrigin } from './LibraryScreen';

export interface ReaderScreenProps {
  chapter: ChapterData;
  nextChapter?: ChapterData | null;
  initialOffset: number;
  theme: ThemeMode;
  fontSize: number;
  arabicScale: number;
  activeFnId?: number | null;
  onChangeActiveFnId?: (fnId: number | null) => void;
  settingsOpen?: boolean;
  onChangeSettingsOpen?: (open: boolean) => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeFontSize: (fontSize: number) => void;
  onChangeArabicScale: (arabicScale: number) => void;
  onUpdateOffset: (chapterId: number, offset: number) => void;
  onRecordQuizResult: (chapterId: number, score: number, passed: boolean) => void;
  onBackToLibrary: () => void;
  onStartQuiz: (chapter: ChapterData, origin: QuizOrigin) => void;
  onOpenNextChapter?: (nextChapter: ChapterData) => void;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({
  chapter,
  nextChapter = null,
  initialOffset,
  theme,
  fontSize,
  arabicScale,
  activeFnId: controlledActiveFnId,
  onChangeActiveFnId,
  settingsOpen: controlledSettingsOpen,
  onChangeSettingsOpen,
  onChangeTheme,
  onChangeFontSize,
  onChangeArabicScale,
  onUpdateOffset,
  onRecordQuizResult,
  onBackToLibrary,
  onStartQuiz,
  onOpenNextChapter,
}) => {
  const [viewport, setViewport] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 390,
    height: typeof window !== 'undefined' ? window.innerHeight : 844,
  }));

  const [charOffset, setCharOffset] = useState<number>(initialOffset);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [internalSettingsOpen, setInternalSettingsOpen] = useState<boolean>(false);
  const [internalActiveFnId, setInternalActiveFnId] = useState<number | null>(null);

  const settingsOpen =
    controlledSettingsOpen !== undefined
      ? controlledSettingsOpen
      : internalSettingsOpen;

  const setSettingsOpen = useCallback(
    (next: boolean) => {
      if (onChangeSettingsOpen) {
        onChangeSettingsOpen(next);
      } else {
        setInternalSettingsOpen(next);
      }
    },
    [onChangeSettingsOpen]
  );

  const activeFnId =
    controlledActiveFnId !== undefined
      ? controlledActiveFnId
      : internalActiveFnId;

  const setActiveFnId = useCallback(
    (next: number | null) => {
      if (onChangeActiveFnId) {
        onChangeActiveFnId(next);
      } else {
        setInternalActiveFnId(next);
      }
    },
    [onChangeActiveFnId]
  );

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef<boolean>(false);

  // При смене главы синхронизируем стартовый offset и сбрасываем открытую сноску/шторку
  useEffect(() => {
    setCharOffset(initialOffset);
    setActiveFnId(null);
    setSettingsOpen(false);
  }, [chapter.id, initialOffset, setActiveFnId, setSettingsOpen]);

  // Отслеживание ресайза окна для пересчета пагинации с сохранением charOffset
  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pages = useMemo(() => {
    return paginate(
      chapter.content,
      fontSize,
      arabicScale,
      viewport.width,
      viewport.height
    );
  }, [chapter.content, fontSize, arabicScale, viewport.width, viewport.height]);

  const pageIndex = useMemo(() => {
    return findPageIndexByOffset(pages, charOffset);
  }, [pages, charOffset]);

  const goToPage = useCallback(
    (targetIdx: number) => {
      const clampedIdx = Math.min(Math.max(0, targetIdx), pages.length - 1);
      const nextOffset = pages[clampedIdx]?.start ?? 0;
      setCharOffset(nextOffset);
      onUpdateOffset(chapter.id, nextOffset);
      setActiveFnId(null);
    },
    [pages, chapter.id, onUpdateOffset, setActiveFnId]
  );

  const turnPage = useCallback(
    (delta: number) => {
      const nextIdx = pageIndex + delta;
      if (nextIdx < 0 || nextIdx >= pages.length) return;
      goToPage(nextIdx);
    },
    [pageIndex, pages.length, goToPage]
  );

  // Если у главы нет проверочных вопросов и открыта последняя страница — автоматически засчитываем PASSED
  useEffect(() => {
    if (
      chapter.quiz.length === 0 &&
      pages.length > 0 &&
      pageIndex === pages.length - 1
    ) {
      onRecordQuizResult(chapter.id, 100, true);
    }
  }, [chapter.id, chapter.quiz.length, pageIndex, pages.length, onRecordQuizResult]);

  // Навигация клавишами ArrowRight / ArrowLeft
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        turnPage(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        turnPage(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [turnPage]);

  const handleToggleFootnote = useCallback(
    (fnId: number) => {
      setActiveFnId(activeFnId === fnId ? null : fnId);
    },
    [activeFnId, setActiveFnId]
  );

  // Обработка клика/тапа по области текста (handleReaderTap)
  const handleReaderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (swipeHandledRef.current) {
      swipeHandledRef.current = false;
      return;
    }

    // 1) Если открыта шторка настроек — закрыть настройки и выйти
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }

    // 2) Если открыта сноска — закрыть сноску и выйти
    if (activeFnId !== null) {
      setActiveFnId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // 3) Левые 25% ширины — предыдущая страница
    if (x < width * 0.25) {
      turnPage(-1);
      return;
    }

    // 4) Правые 25% ширины — следующая страница
    if (x > width * 0.75) {
      turnPage(1);
      return;
    }

    // 5) Центральные 50% — переключить видимость HUD
    setControlsVisible((prev) => !prev);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      swipeHandledRef.current = true;
      if (dx < -50) {
        turnPage(1);
      } else if (dx > 50) {
        turnPage(-1);
      }
    }
  };

  const activeTheme = THEMES[theme];
  const currentPage = pages[pageIndex] ?? { start: 0, end: 0, text: '' };
  const isFirst = pageIndex === 0;
  const isLast = pageIndex === pages.length - 1;

  const activeFootnote = useMemo(() => {
    if (activeFnId === null || !chapter.footnotes) return null;
    return chapter.footnotes.find((fn) => fn.id === activeFnId) ?? null;
  }, [activeFnId, chapter.footnotes]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        backgroundColor: activeTheme.bg,
        color: activeTheme.fg,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Верхний HUD (reader-hud-top) */}
      {controlsVisible && (
        <header
          className="reader-hud-top"
          style={{
            backgroundColor: BRAND_COLORS.primaryBg,
            color: BRAND_COLORS.primaryText,
            borderBottom: '1px solid rgba(180, 83, 9, 0.4)',
            zIndex: 25,
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onBackToLibrary}
              className="cursor-pointer whitespace-nowrap shrink-0"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: BRAND_COLORS.primaryText,
                border: 'none',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              ← Оглавление
            </button>

            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'Georgia, serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: BRAND_COLORS.primaryText,
              }}
            >
              {chapter.title}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveFnId(null);
                setSettingsOpen(!settingsOpen);
              }}
              className="cursor-pointer whitespace-nowrap shrink-0"
              style={{
                background: settingsOpen
                  ? BRAND_COLORS.amberAccent
                  : 'rgba(255, 255, 255, 0.1)',
                color: BRAND_COLORS.primaryText,
                border: '1px solid rgba(180, 83, 9, 0.5)',
                borderRadius: '10px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              Аа
            </button>
          </div>
        </header>
      )}

      {/* Основная область страницы (reader-page-area) */}
      <div
        className="reader-page-area"
        onClick={handleReaderTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          flex: 1,
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          padding: '18px 22px 12px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: 'Georgia, "Lora", serif',
          fontSize: `${fontSize}px`,
          lineHeight: 1.6,
        }}
      >
        {/* Кастомный вертикальный скроллбар режима чтения */}
        <CustomScrollbar
          mode="reader"
          pageIndex={pageIndex}
          totalPages={pages.length}
          onPageChange={goToPage}
        />

        <div>
          {isFirst && (
            <h1
              style={{
                fontSize: `${Math.round(fontSize * 1.15)}px`,
                fontWeight: 700,
                lineHeight: 1.3,
                margin: '0 0 14px 0',
                paddingBottom: '10px',
                borderBottom: '1px solid rgba(180, 83, 9, 0.25)',
              }}
            >
              {chapter.title}
            </h1>
          )}

          <div>
            {formatReaderPageContent({
              text: currentPage.text,
              baseFontSize: fontSize,
              arabicScale,
              footnotes: chapter.footnotes,
              activeFnId,
              onToggleFootnote: handleToggleFootnote,
            })}
          </div>
        </div>

        {/* Попап сноски в нижней части области чтения (fn-popup) */}
        <FootnotePopup
          activeFn={activeFootnote}
          theme={activeTheme}
          fontSize={fontSize}
          arabicScale={arabicScale}
          onClose={() => setActiveFnId(null)}
        />
      </div>

      {/* Нижняя шторка настроек чтения (SettingsSheet) */}
      <SettingsSheet
        isOpen={settingsOpen}
        themeMode={theme}
        fontSize={fontSize}
        arabicScale={arabicScale}
        onChangeTheme={onChangeTheme}
        onChangeFontSize={onChangeFontSize}
        onChangeArabicScale={onChangeArabicScale}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Нижний колонтитул (reader-footer) */}
      <footer
        className="reader-footer"
        style={{
          backgroundColor: activeTheme.surface,
          borderTop: '1px solid rgba(180, 83, 9, 0.25)',
          padding: '10px 16px',
          zIndex: 25,
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Кнопки перелистывания ← и → */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              disabled={isFirst}
              onClick={() => turnPage(-1)}
              className="cursor-pointer disabled:opacity-35"
              style={{
                backgroundColor: BRAND_COLORS.primaryBg,
                color: BRAND_COLORS.primaryText,
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              ←
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => turnPage(1)}
              className="cursor-pointer disabled:opacity-35"
              style={{
                backgroundColor: BRAND_COLORS.primaryBg,
                color: BRAND_COLORS.primaryText,
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              →
            </button>
          </div>

          {/* Счетчик страниц по центру */}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Стр. {pageIndex + 1} / {pages.length}
          </div>

          {/* Кнопка действия справа на последней странице */}
          <div style={{ minWidth: '110px', display: 'flex', justifyContent: 'flex-end' }}>
            {isLast && chapter.quiz.length > 0 && (
              <button
                type="button"
                onClick={() => onStartQuiz(chapter, 'reader')}
                className="cursor-pointer whitespace-nowrap shrink-0"
                style={{
                  background: '#B45309',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Пройти тест →
              </button>
            )}

            {isLast &&
              chapter.quiz.length === 0 &&
              nextChapter &&
              onOpenNextChapter && (
                <button
                  type="button"
                  onClick={() => onOpenNextChapter(nextChapter)}
                  className="cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    background: '#15803D',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Следующая глава →
                </button>
              )}
          </div>
        </div>
      </footer>
    </div>
  );
};
