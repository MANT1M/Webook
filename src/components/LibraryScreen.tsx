import React, { useState, useMemo } from 'react';
import { BookOpen, Search, X, Download } from 'lucide-react';
import { BookData, ChapterData, ChapterProgress } from '../types/reader';
import { BRAND_COLORS } from '../constants/theme';
import { CustomScrollbar } from './CustomScrollbar';
import { AmveraFilesModal } from './AmveraFilesModal';

export type QuizOrigin = 'library' | 'reader';

export interface LibraryScreenProps {
  book: BookData;
  progress: Record<number, ChapterProgress>;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onOpenChapter: (chapter: ChapterData) => void;
  onStartQuiz: (chapter: ChapterData, origin: QuizOrigin) => void;
}

interface ChapterCardProps {
  chapter: ChapterData;
  totalChapters: number;
  chapterProgress: ChapterProgress;
  onReadChapter: (chapter: ChapterData) => void;
  onOpenQuiz: (chapter: ChapterData, origin: QuizOrigin) => void;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  totalChapters,
  chapterProgress,
  onReadChapter,
  onOpenQuiz,
}) => {
  const isPassed = chapterProgress?.status === 'PASSED';
  const hasOffset = (chapterProgress?.offset ?? 0) > 0;
  const hasQuiz = chapter.quiz.length > 0;

  return (
    <article
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E0D5',
        borderRadius: '16px',
        padding: '18px',
        marginBottom: '14px',
      }}
    >
      {/* Верхняя строка статуса рендерится ТОЛЬКО если глава пройдена */}
      {isPassed && (
        <div
          className="meta-line"
          style={{
            fontSize: '12px',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: '#15803D',
            fontWeight: 600,
            marginBottom: '6px',
          }}
        >
          Пройдено · Лучший результат: {chapterProgress.bestScore}%
        </div>
      )}

      {/* Заголовок главы */}
      <h3
        style={{
          fontSize: '17px',
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          lineHeight: 1.35,
          color: '#1C1B1F',
          margin: '0 0 6px 0',
        }}
      >
        {chapter.title}
      </h3>

      {/* Подзаголовок */}
      <div
        style={{
          fontSize: '12px',
          color: '#475569',
          marginBottom: '12px',
        }}
      >
        Часть {chapter.chapterOrder} из {totalChapters} · Проверочных вопросов:{' '}
        {chapter.quiz.length}
      </div>

      {/* Кнопки действий в один ряд */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => onReadChapter(chapter)}
          className="cursor-pointer transition-opacity hover:opacity-95 active:scale-[0.99]"
          style={{
            flex: 1,
            backgroundColor: '#06372C',
            color: '#FEF3C7',
            borderRadius: '12px',
            padding: '12px 16px',
            fontWeight: 600,
            fontSize: '14px',
            border: 'none',
          }}
        >
          {hasOffset ? 'Продолжить чтение' : 'Читать главу'}
        </button>

        {hasQuiz && (
          <button
            type="button"
            onClick={() => onOpenQuiz(chapter, 'library')}
            className="cursor-pointer transition-colors hover:bg-slate-50 active:scale-[0.99]"
            style={{
              backgroundColor: 'transparent',
              border: '1.5px solid #CBD5E1',
              color: '#1E293B',
              borderRadius: '12px',
              padding: '12px 18px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Тест
          </button>
        )}
      </div>
    </article>
  );
};

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  book,
  progress,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
  onOpenChapter,
  onStartQuiz,
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');
  const [amveraModalOpen, setAmveraModalOpen] = useState<boolean>(false);

  const searchQuery =
    controlledSearchQuery !== undefined
      ? controlledSearchQuery
      : internalSearchQuery;

  const setSearchQuery = (val: string) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(val);
    } else {
      setInternalSearchQuery(val);
    }
  };

  const totalChapters = book.chapters.length;

  const passedCount = useMemo(() => {
    return book.chapters.filter((ch) => progress[ch.id]?.status === 'PASSED')
      .length;
  }, [book.chapters, progress]);

  const ratio = useMemo(() => {
    if (totalChapters === 0) return 0;
    return Math.round((passedCount / totalChapters) * 100);
  }, [passedCount, totalChapters]);

  const filteredChapters = useMemo(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) return book.chapters;

    return book.chapters.filter(
      (ch) =>
        ch.title.toLowerCase().includes(trimmed) ||
        ch.content.toLowerCase().includes(trimmed)
    );
  }, [book.chapters, searchQuery]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
      {/* Кастомный вертикальный скроллбар для главного экрана */}
      <CustomScrollbar mode="library" />

      {/* TopBar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: BRAND_COLORS.primaryBg,
          color: BRAND_COLORS.primaryText,
          borderBottom: '1px solid rgba(180, 83, 9, 0.35)',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
            }}
          >
            <BookOpen
              className="w-5 h-5 shrink-0"
              style={{ color: BRAND_COLORS.secondaryText }}
            />
            <span
              style={{
                fontWeight: 700,
                fontSize: '16px',
                fontFamily: 'Georgia, serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {book.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="shrink-0">
            <button
              type="button"
              onClick={() => setAmveraModalOpen(true)}
              title="Скачать файлы для Amvera Cloud"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#FEF3C7',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Файлы Amvera</span>
            </button>

            <div
              className="tabular-nums"
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: BRAND_COLORS.secondaryText,
              }}
            >
              {passedCount}/{book.chapters.length} глав
            </div>
          </div>
        </div>
      </header>

      {/* Основной контейнер */}
      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '16px',
        }}
      >
        {/* Карточка книги (book-header) */}
        <section
          className="book-header"
          style={{
            backgroundColor: '#06372C',
            color: '#FEF3C7',
            border: '1px solid #B45309',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              opacity: 0.85,
              letterSpacing: '0.04em',
              marginBottom: '6px',
              fontWeight: 600,
            }}
          >
            {book.author.toUpperCase()} · {book.year}
          </div>

          <h2
            style={{
              fontSize: '22px',
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
              margin: '0 0 8px 0',
              lineHeight: 1.25,
            }}
          >
            {book.title}
          </h2>

          <p
            style={{
              fontSize: '13px',
              color: '#FDE68A',
              lineHeight: 1.55,
              margin: '0 0 16px 0',
            }}
          >
            {book.description}
          </p>

          {/* Строка прогресса */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              marginBottom: '8px',
            }}
          >
            <span>Прогресс чтения и тестов</span>
            <span className="tabular-nums" style={{ fontWeight: 600 }}>
              {passedCount} / {book.chapters.length} глав ({ratio}%)
            </span>
          </div>

          {/* Прогресс-бар */}
          <div
            style={{
              height: '8px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${ratio}%`,
                backgroundColor: '#F59E0B',
                borderRadius: '9999px',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </section>

        {/* Поле поиска */}
        <section style={{ marginBottom: '16px' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              className="w-4 h-4 pointer-events-none"
              style={{
                position: 'absolute',
                left: '14px',
                color: '#64748B',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по главам и темам книги „Простые благодеяния“..."
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E0D5',
                borderRadius: '14px',
                padding: '12px 38px 12px 40px',
                fontSize: '14px',
                color: '#1C1B1F',
                outline: 'none',
              }}
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Очистить поиск"
                className="cursor-pointer"
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  padding: '4px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>

        {/* Список карточек глав */}
        <section>
          {filteredChapters.length > 0 ? (
            filteredChapters.map((chapter) => {
              const chapterProgress: ChapterProgress = progress[chapter.id] ?? {
                status: 'AVAILABLE',
                offset: 0,
                bestScore: 0,
              };

              return (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  totalChapters={book.chapters.length}
                  chapterProgress={chapterProgress}
                  onReadChapter={onOpenChapter}
                  onOpenQuiz={onStartQuiz}
                />
              );
            })
          ) : (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E0D5',
                borderRadius: '16px',
                padding: '28px 18px',
                textAlign: 'center',
                color: '#475569',
                fontSize: '14px',
              }}
            >
              {book.chapters.length === 0
                ? 'Список глав пуст.'
                : `По запросу «${searchQuery}» ничего не найдено.`}
            </div>
          )}
        </section>
      </main>

      {/* Модальное окно для удобного скачивания файлов на Amvera */}
      <AmveraFilesModal
        isOpen={amveraModalOpen}
        onClose={() => setAmveraModalOpen(false)}
      />
    </div>
  );
};
