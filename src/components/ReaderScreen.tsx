import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChapterData, ThemeMode } from '../types/reader';
import { BRAND_COLORS, THEMES } from '../constants/theme';
import { formatReaderPageContent } from '../utils/arabicFormatter';
import { FootnotePopup } from './FootnotePopup';
import { SettingsSheet } from './SettingsSheet';
import { QuizOrigin } from './LibraryScreen';

export interface ReaderScreenProps {
  chapter: ChapterData;
  previousChapter?: ChapterData | null;
  nextChapter?: ChapterData | null;
  siblingSubchapters?: ChapterData[];
  onSelectSubchapter?: (subchapter: ChapterData) => void;
  initialOffset: number;
  theme: ThemeMode;
  fontSize: number;
  arabicScale: number;
  activeFnId?: number | null;
  onChangeActiveFnId?: (
    fnId: number | null | ((prev: number | null) => number | null)
  ) => void;
  settingsOpen?: boolean;
  onChangeSettingsOpen?: (open: boolean) => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeFontSize: (fontSize: number) => void;
  onChangeArabicScale: (arabicScale: number) => void;
  onUpdateOffset: (chapterId: number, offset: number) => void;
  onRecordQuizResult: (chapterId: number, score: number, passed: boolean) => void;
  onBackToLibrary: () => void;
  onStartQuiz: (chapter: ChapterData, origin: QuizOrigin) => void;
  onOpenPreviousChapter?: (prevChapter: ChapterData) => void;
  onOpenNextChapter?: (nextChapter: ChapterData) => void;
}

export const ReaderScreen: React.FC<ReaderScreenProps> = ({
  chapter,
  previousChapter = null,
  nextChapter = null,
  siblingSubchapters = [],
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
  onOpenPreviousChapter,
  onOpenNextChapter,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const currentChapterIdRef = useRef<number | null>(null);
  const lastToggleTimeRef = useRef<number>(0);

  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [internalSettingsOpen, setInternalSettingsOpen] = useState<boolean>(false);
  const [internalActiveFnId, setInternalActiveFnId] = useState<number | null>(null);
  const [scrollProgressPct, setScrollProgressPct] = useState<number>(0);

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
    (next: number | null | ((prev: number | null) => number | null)) => {
      if (onChangeActiveFnId) {
        onChangeActiveFnId(next);
      } else {
        setInternalActiveFnId(next);
      }
    },
    [onChangeActiveFnId]
  );

  // Восстановление позиции прокрутки при открытии или смене главы
  // Важно: зависимость ТОЛЬКО chapter.id, чтобы debounce-обновления позиции во время чтения
  // не вызывали сброс сносок (setActiveFnId(null)) и не дергали скролл!
  useEffect(() => {
    if (currentChapterIdRef.current === chapter.id) {
      return;
    }
    currentChapterIdRef.current = chapter.id;

    setActiveFnId(null);
    setSettingsOpen(false);

    const el = scrollContainerRef.current;
    if (!el) return;

    if (initialOffset > 0) {
      const timer = window.setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = initialOffset;
        }
      }, 50);
      return () => window.clearTimeout(timer);
    } else {
      el.scrollTop = 0;
      setScrollProgressPct(0);
    }
  }, [chapter.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Обработка прокрутки: расчет прогресса и сохранение позиции
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;
    const maxScroll = scrollHeight - clientHeight;

    let pct = 0;
    if (maxScroll > 0) {
      pct = Math.min(100, Math.max(0, Math.round((scrollTop / maxScroll) * 100)));
    }
    setScrollProgressPct(pct);

    // Автоматически отмечаем прочитанной, если нет вопросов и дочитали до конца (>= 92%)
    if (chapter.quiz.length === 0 && (pct >= 92 || scrollTop + clientHeight >= scrollHeight - 30)) {
      onRecordQuizResult(chapter.id, 100, true);
    }

    // Сохраняем позицию с debounce
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      onUpdateOffset(chapter.id, Math.round(scrollTop));
    }, 250);
  }, [chapter.id, chapter.quiz.length, onRecordQuizResult, onUpdateOffset]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleFootnote = useCallback(
    (fnId: number) => {
      const now = Date.now();
      // Защита от дублирующих срабатываний touch + click событий на мобильных экранах
      if (now - lastToggleTimeRef.current < 250) {
        return;
      }
      lastToggleTimeRef.current = now;
      setActiveFnId((prev) => (prev === fnId ? null : fnId));
    },
    [setActiveFnId]
  );

  // Нажатие на область чтения: закрывает сноску/настройки или переключает HUD
  const handleContentAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Если клик был по интерактивному элементу или модальному окну — не закрываем и не переключаем HUD
    if (
      target.closest('button') ||
      target.closest('.fn-badge') ||
      target.closest('.fn-popup') ||
      target.closest('.fn-backdrop') ||
      target.closest('a')
    ) {
      return;
    }

    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }

    if (activeFnId !== null) {
      setActiveFnId(null);
      return;
    }

    // Клик по тексту переключает видимость панели управления
    setControlsVisible((prev) => !prev);
  };

  const activeTheme = THEMES[theme];

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
        overflow: 'hidden',
      }}
    >
      {/* Верхний HUD */}
      {controlsVisible && (
        <header
          className="reader-hud-top"
          style={{
            backgroundColor: BRAND_COLORS.primaryBg,
            color: BRAND_COLORS.primaryText,
            borderBottom: '1px solid rgba(180, 83, 9, 0.4)',
            zIndex: 30,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <div
            style={{
              maxWidth: '760px',
              margin: '0 auto',
              padding: '10px 16px',
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
                padding: '0 4px',
              }}
            >
              {chapter.parentChapterTitle
                ? `${chapter.parentChapterTitle} · Подглава ${chapter.subchapterOrder ?? 1}`
                : chapter.title}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: BRAND_COLORS.amberAccent,
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                {scrollProgressPct}%
              </span>

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
          </div>

          {/* Индикатор прогресса чтения по всей ширине вверху */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3px',
              width: `${scrollProgressPct}%`,
              backgroundColor: BRAND_COLORS.amberAccent,
              transition: 'width 0.15s ease-out',
            }}
          />
        </header>
      )}

      {/* Основная непрерывная область чтения полного текста главы */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onClick={handleContentAreaClick}
          className="reader-full-content-scroll"
          style={{
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '24px 20px 48px 20px',
            maxWidth: '760px',
            margin: '0 auto',
            fontFamily: 'Georgia, "Lora", serif',
            fontSize: `${fontSize}px`,
            lineHeight: 1.6,
          }}
        >
          {/* Заголовок главы / подглавы */}
          <div
            style={{
              marginBottom: '28px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(180, 83, 9, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: BRAND_COLORS.amberAccent,
                marginBottom: '6px',
              }}
            >
              {chapter.parentChapterTitle
                ? `Глава ${chapter.parentChapterNumber ?? chapter.chapterOrder} · Подглава ${chapter.subchapterOrder ?? 1} из ${chapter.subchapterCount ?? siblingSubchapters.length}`
                : `Глава ${chapter.chapterOrder ?? chapter.id}`}
            </div>

            {chapter.parentChapterTitle && (
              <div
                style={{
                  fontSize: `${Math.round(fontSize * 1.15)}px`,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  marginBottom: '8px',
                  color: BRAND_COLORS.amberAccent,
                }}
              >
                {chapter.parentChapterTitle}
              </div>
            )}

            <h1
              style={{
                fontSize: `${Math.round(fontSize * (chapter.parentChapterTitle ? 1.1 : 1.25))}px`,
                fontWeight: 700,
                lineHeight: 1.3,
                margin: 0,
              }}
            >
              {chapter.title}
            </h1>
          </div>

          {/* Полный текст главы с красивым форматированием */}
          <div style={{ wordBreak: 'break-word' }}>
            {formatReaderPageContent({
              text: chapter.content,
              baseFontSize: fontSize,
              arabicScale,
              footnotes: chapter.footnotes,
              activeFnId,
              onToggleFootnote: handleToggleFootnote,
            })}
          </div>

          {/* Блок завершения главы */}
          <div
            style={{
              marginTop: '48px',
              paddingTop: '28px',
              borderTop: '2px dashed rgba(180, 83, 9, 0.35)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                letterSpacing: '8px',
                color: BRAND_COLORS.amberAccent,
                marginBottom: '12px',
              }}
            >
              ❖ ❖ ❖
            </div>

            <div
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: activeTheme.fg,
                opacity: 0.85,
                marginBottom: '20px',
              }}
            >
              {chapter.parentChapterTitle
                ? `Конец подглавы ${chapter.subchapterOrder ?? 1} из ${chapter.subchapterCount ?? siblingSubchapters.length}`
                : 'Конец главы'}
            </div>

            {/* Кнопка прохождения теста, если есть проверочные вопросы */}
            {chapter.quiz.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <button
                  type="button"
                  onClick={() => onStartQuiz(chapter, 'reader')}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: '#B45309',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(180, 83, 9, 0.3)',
                    transition: 'transform 0.15s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span>
                    {chapter.parentChapterTitle
                      ? `Пройти тест по подглаве (${chapter.quiz.length} вопр.)`
                      : `Пройти тест по главе (${chapter.quiz.length} вопр.)`}
                  </span>
                  <span>→</span>
                </button>
              </div>
            )}

            {/* Навигационные кнопки в конце главы */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '12px',
                marginTop: '12px',
              }}
            >
              {previousChapter && onOpenPreviousChapter && (
                <button
                  type="button"
                  onClick={() => onOpenPreviousChapter(previousChapter)}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: activeTheme.surface,
                    color: activeTheme.fg,
                    border: '1px solid rgba(180, 83, 9, 0.4)',
                    borderRadius: '12px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  ←{' '}
                  {previousChapter.parentChapterTitle
                    ? `Предыдущая подглава: ${previousChapter.title}`
                    : `Предыдущая глава: ${previousChapter.title}`}
                </button>
              )}

              {nextChapter && onOpenNextChapter && (
                <button
                  type="button"
                  onClick={() => onOpenNextChapter(nextChapter)}
                  className="cursor-pointer"
                  style={{
                    backgroundColor: '#15803D',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(21, 128, 61, 0.25)',
                  }}
                >
                  {nextChapter.parentChapterTitle
                    ? `Следующая подглава: ${nextChapter.title}`
                    : `Следующая глава: ${nextChapter.title}`}{' '}
                  →
                </button>
              )}

              <button
                type="button"
                onClick={onBackToLibrary}
                className="cursor-pointer"
                style={{
                  backgroundColor: 'transparent',
                  color: BRAND_COLORS.amberAccent,
                  border: '1px solid rgba(180, 83, 9, 0.4)',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                Вернуться к оглавлению
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Попап сноски в виде фиксированного модального окна снизу экрана */}
      <FootnotePopup
        activeFn={activeFootnote}
        theme={activeTheme}
        fontSize={fontSize}
        arabicScale={arabicScale}
        onClose={() => setActiveFnId(null)}
      />

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

      {/* Нижний колонтитул */}
      {controlsVisible && (
        <footer
          className="reader-footer"
          style={{
            backgroundColor: activeTheme.surface,
            borderTop: '1px solid rgba(180, 83, 9, 0.25)',
            padding: '10px 16px',
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              maxWidth: '760px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            {/* Кнопка на предыдущую главу */}
            {previousChapter && onOpenPreviousChapter ? (
              <button
                type="button"
                onClick={() => onOpenPreviousChapter(previousChapter)}
                className="cursor-pointer"
                style={{
                  backgroundColor: BRAND_COLORS.primaryBg,
                  color: BRAND_COLORS.primaryText,
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ← Пред. глава
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackToLibrary}
                className="cursor-pointer"
                style={{
                  backgroundColor: 'transparent',
                  color: activeTheme.fg,
                  opacity: 0.75,
                  border: '1px solid rgba(180, 83, 9, 0.3)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Оглавление
              </button>
            )}

            {/* Прогресс по центру */}
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 600,
                color: activeTheme.fg,
              }}
            >
              Прогресс: {scrollProgressPct}%
            </div>

            {/* Кнопка перехода к тесту или следующей главе */}
            <div>
              {chapter.quiz.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onStartQuiz(chapter, 'reader')}
                  className="cursor-pointer whitespace-nowrap"
                  style={{
                    background: '#B45309',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Тест →
                </button>
              ) : nextChapter && onOpenNextChapter ? (
                <button
                  type="button"
                  onClick={() => onOpenNextChapter(nextChapter)}
                  className="cursor-pointer whitespace-nowrap"
                  style={{
                    background: '#15803D',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  След. глава →
                </button>
              ) : null}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
