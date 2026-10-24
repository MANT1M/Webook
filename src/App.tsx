/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { EASY_GOOD_DEEDS_BOOK } from './data/easyGoodDeedsData';
import { useReaderState } from './hooks/useReaderState';
import { ChapterData } from './types/reader';
import { LibraryScreen, QuizOrigin } from './components/LibraryScreen';
import { ReaderScreen } from './components/ReaderScreen';
import { QuizScreen } from './components/QuizScreen';

type ScreenType = 'library' | 'reader' | 'quiz';

function pushHistoryTag(tag: string) {
  try {
    window.history.pushState({ tag }, '', '#' + tag);
  } catch {
    // Ignore history API restrictions in sandboxed environments
  }
}

export default function App() {
  const {
    theme,
    fontSize,
    arabicScale,
    progress,
    setTheme,
    setFontSize,
    setArabicScale,
    updateChapterOffset,
    recordQuizResult,
    getChapterProgress,
  } = useReaderState();

  const [screen, setScreen] = useState<ScreenType>('library');
  const [activeChapter, setActiveChapter] = useState<ChapterData | null>(
    EASY_GOOD_DEEDS_BOOK.chapters[0] ?? null
  );
  const [quizOrigin, setQuizOrigin] = useState<QuizOrigin>('library');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFnId, setActiveFnId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const searchPushedRef = useRef<boolean>(false);

  // Обработка начального URL-хэша (#settings, #reader-xxx, #quiz-xxx)
  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;

      if (hash === 'settings') {
        setScreen('reader');
        setSettingsOpen(true);
      } else if (hash.startsWith('reader-')) {
        const chapterId = Number(hash.replace('reader-', ''));
        const found = EASY_GOOD_DEEDS_BOOK.chapters.find((c) => c.id === chapterId);
        if (found) {
          setActiveChapter(found);
          setScreen('reader');
        }
      } else if (hash.startsWith('quiz-')) {
        const chapterId = Number(hash.replace('quiz-', ''));
        const found = EASY_GOOD_DEEDS_BOOK.chapters.find((c) => c.id === chapterId);
        if (found) {
          setActiveChapter(found);
          setScreen('quiz');
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Обработчик изменения поискового запроса с пушем в History API при начале поиска
  const handleSearchQueryChange = useCallback((nextQuery: string) => {
    setSearchQuery((prev) => {
      if (prev === '' && nextQuery.trim() !== '' && !searchPushedRef.current) {
        pushHistoryTag('search');
        searchPushedRef.current = true;
      } else if (nextQuery === '') {
        searchPushedRef.current = false;
      }
      return nextQuery;
    });
  }, []);

  // Открытие главы
  const handleOpenChapter = useCallback((chapter: ChapterData) => {
    setActiveChapter(chapter);
    setActiveFnId(null);
    setSettingsOpen(false);
    setScreen('reader');
    pushHistoryTag(`reader-${chapter.id}`);
  }, []);

  // Открытие/закрытие сноски
  const handleChangeActiveFnId = useCallback((fnId: number | null) => {
    setActiveFnId((prev) => {
      if (prev === null && fnId !== null) {
        pushHistoryTag(`fn-${fnId}`);
      }
      return fnId;
    });
  }, []);

  // Открытие/закрытие настроек
  const handleChangeSettingsOpen = useCallback((open: boolean) => {
    setSettingsOpen((prev) => {
      if (!prev && open) {
        pushHistoryTag('settings');
      }
      return open;
    });
  }, []);

  // Запуск теста с сохранением quizOrigin ('library' | 'reader')
  const handleStartQuiz = useCallback(
    (chapter: ChapterData, origin: QuizOrigin) => {
      setActiveChapter(chapter);
      setQuizOrigin(origin);
      setActiveFnId(null);
      setSettingsOpen(false);
      setScreen('quiz');
      pushHistoryTag(`quiz-${chapter.id}`);
    },
    []
  );

  // Приоритетная многоуровневая обработка возврата («Назад» / popstate / Escape)
  const handlePriorityBack = useCallback((): boolean => {
    // 1) Если открыта сноска (activeFnId !== null) -> закрыть сноску
    if (activeFnId !== null) {
      setActiveFnId(null);
      return true;
    }

    // 2) Иначе если открыта шторка настроек (settingsOpen === true) -> закрыть настройки
    if (settingsOpen) {
      setSettingsOpen(false);
      return true;
    }

    // 3) Иначе если открыт экран теста (screen === 'quiz') -> вернуть на экран quizOrigin ('reader' или 'library')
    if (screen === 'quiz') {
      setScreen(quizOrigin);
      return true;
    }

    // 4) Иначе если открыт экран чтения (screen === 'reader') -> вернуться в оглавление (screen = 'library')
    if (screen === 'reader') {
      setScreen('library');
      return true;
    }

    // 5) Иначе если в оглавлении активен поисковый запрос (searchQuery !== '') -> очистить строку поиска
    if (searchQuery !== '') {
      setSearchQuery('');
      searchPushedRef.current = false;
      return true;
    }

    return false;
  }, [activeFnId, settingsOpen, screen, quizOrigin, searchQuery]);

  // Слушатели popstate и клавиши Escape
  useEffect(() => {
    const onPopState = () => {
      handlePriorityBack();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const handled = handlePriorityBack();
        if (handled) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handlePriorityBack]);

  if (screen === 'library' || !activeChapter) {
    return (
      <LibraryScreen
        book={EASY_GOOD_DEEDS_BOOK}
        progress={progress}
        searchQuery={searchQuery}
        onSearchQueryChange={handleSearchQueryChange}
        onOpenChapter={handleOpenChapter}
        onStartQuiz={handleStartQuiz}
      />
    );
  }

  const currentIndex = EASY_GOOD_DEEDS_BOOK.chapters.findIndex(
    (ch) => ch.id === activeChapter.id
  );
  const previousChapter =
    currentIndex > 0 ? EASY_GOOD_DEEDS_BOOK.chapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex + 1 < EASY_GOOD_DEEDS_BOOK.chapters.length
      ? EASY_GOOD_DEEDS_BOOK.chapters[currentIndex + 1]
      : null;

  const chapterProg = getChapterProgress(activeChapter.id);

  if (screen === 'reader') {
    return (
      <ReaderScreen
        chapter={activeChapter}
        previousChapter={previousChapter}
        nextChapter={nextChapter}
        initialOffset={chapterProg.offset}
        theme={theme}
        fontSize={fontSize}
        arabicScale={arabicScale}
        activeFnId={activeFnId}
        onChangeActiveFnId={handleChangeActiveFnId}
        settingsOpen={settingsOpen}
        onChangeSettingsOpen={handleChangeSettingsOpen}
        onChangeTheme={setTheme}
        onChangeFontSize={setFontSize}
        onChangeArabicScale={setArabicScale}
        onUpdateOffset={updateChapterOffset}
        onRecordQuizResult={recordQuizResult}
        onBackToLibrary={() => {
          setActiveFnId(null);
          setSettingsOpen(false);
          setScreen('library');
        }}
        onStartQuiz={handleStartQuiz}
        onOpenPreviousChapter={(prevCh) => {
          updateChapterOffset(prevCh.id, 0);
          handleOpenChapter(prevCh);
        }}
        onOpenNextChapter={(nextCh) => {
          updateChapterOffset(nextCh.id, 0);
          handleOpenChapter(nextCh);
        }}
      />
    );
  }

  return (
    <QuizScreen
      book={EASY_GOOD_DEEDS_BOOK}
      chapter={activeChapter}
      nextChapter={nextChapter}
      arabicScale={arabicScale}
      onRecordQuizResult={recordQuizResult}
      onBackToChapter={(resetToFirstPage = false) => {
        if (resetToFirstPage) {
          updateChapterOffset(activeChapter.id, 0);
        }
        setScreen('reader');
      }}
      onBackToLibrary={() => setScreen('library')}
      onOpenNextChapter={(nextCh) => {
        updateChapterOffset(nextCh.id, 0);
        handleOpenChapter(nextCh);
      }}
    />
  );
}
