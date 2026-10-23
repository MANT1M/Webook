import React, { useState, useEffect } from 'react';
import { BookData, ChapterData } from '../types/reader';
import { BRAND_COLORS } from '../constants/theme';
import { formatMixedArabicHtml } from '../utils/arabicFormatter';

export interface QuizScreenProps {
  book: BookData;
  chapter: ChapterData;
  nextChapter?: ChapterData | null;
  arabicScale: number;
  onRecordQuizResult: (chapterId: number, score: number, passed: boolean) => void;
  onBackToChapter: (resetToFirstPage?: boolean) => void;
  onBackToLibrary: () => void;
  onOpenNextChapter?: (nextChapter: ChapterData) => void;
}

const OPTION_LETTERS = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];

export const QuizScreen: React.FC<QuizScreenProps> = ({
  book,
  chapter,
  nextChapter = null,
  arabicScale,
  onRecordQuizResult,
  onBackToChapter,
  onBackToLibrary,
  onOpenNextChapter,
}) => {
  const [qIndex, setQIndex] = useState<number>(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [quizDone, setQuizDone] = useState<boolean>(false);

  // Сброс состояния при смене главы
  useEffect(() => {
    setQIndex(0);
    setSelectedOpt(null);
    setSubmitted(false);
    setCorrectCount(0);
    setQuizDone(false);
  }, [chapter.id]);

  // Если у главы нет проверочных вопросов
  if (chapter.quiz.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            backgroundColor: BRAND_COLORS.primaryBg,
            color: BRAND_COLORS.primaryText,
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => onBackToChapter(false)}
              className="cursor-pointer"
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
              ← К главе
            </button>
          </div>
        </header>

        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              К этой главе нет проверочных вопросов
            </p>
            <button
              type="button"
              onClick={() => onBackToChapter(false)}
              className="cursor-pointer"
              style={{
                backgroundColor: '#06372C',
                color: '#FEF3C7',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              ← К главе
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Режим результатов теста (quizDone === true)
  if (quizDone) {
    const score = Math.round((correctCount / chapter.quiz.length) * 100);
    const passed = score >= 75;

    const handleRetryQuiz = () => {
      setQIndex(0);
      setSelectedOpt(null);
      setSubmitted(false);
      setCorrectCount(0);
      setQuizDone(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            backgroundColor: BRAND_COLORS.primaryBg,
            color: BRAND_COLORS.primaryText,
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              margin: '0 auto',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              onClick={() => onBackToChapter(false)}
              className="cursor-pointer"
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
              ← К главе
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>
              Итоги теста
            </span>
            <span
              className="tabular-nums"
              style={{ fontSize: '13px', color: BRAND_COLORS.secondaryText }}
            >
              Верно: {correctCount}
            </span>
          </div>
        </header>

        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '20px 16px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div
              className="tabular-nums"
              style={{
                fontSize: '48px',
                fontWeight: 800,
                color: passed ? '#15803D' : '#B91C1C',
                lineHeight: 1.1,
                marginBottom: '8px',
              }}
            >
              {score}%
            </div>

            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                fontFamily: 'Georgia, serif',
                margin: '0 0 10px 0',
                color: '#0F172A',
              }}
            >
              {passed ? 'Глава успешно пройдена!' : 'Тест не пройден'}
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: '#475569',
                lineHeight: 1.5,
                margin: '0 0 22px 0',
              }}
            >
              Правильных ответов: {correctCount} из {chapter.quiz.length}.{' '}
              {passed
                ? 'Отличный результат! Вы можете перейти к следующей главе.'
                : 'Для успешного прохождения теста необходимо набрать минимум 75%.'}
            </p>

            {/* 4 кнопки действий (вертикальный стек) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {passed && nextChapter && onOpenNextChapter && (
                <button
                  type="button"
                  onClick={() => onOpenNextChapter(nextChapter)}
                  className="cursor-pointer"
                  style={{
                    width: '100%',
                    background: '#15803D',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '13px 16px',
                    fontSize: '15px',
                    fontWeight: 600,
                  }}
                >
                  Следующая глава →
                </button>
              )}

              <button
                type="button"
                onClick={() => onBackToChapter(!passed)}
                className="cursor-pointer"
                style={{
                  width: '100%',
                  background: '#06372C',
                  color: '#FEF3C7',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '13px 16px',
                  fontSize: '15px',
                  fontWeight: 600,
                }}
              >
                {passed ? 'Вернуться к главе' : 'Перечитать главу'}
              </button>

              <button
                type="button"
                onClick={handleRetryQuiz}
                className="btn-outline"
              >
                Повторить тест
              </button>

              <button
                type="button"
                onClick={onBackToLibrary}
                className="btn-outline"
              >
                В библиотеку
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Режим прохождения вопросов (!quizDone)
  const q = chapter.quiz[qIndex];
  const isLastQuestion = qIndex === chapter.quiz.length - 1;

  const handleSubmitOrNext = () => {
    if (!submitted) {
      if (selectedOpt === null) return;
      const isCorrect = selectedOpt === q.correctAnswerIndex;
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
      }
      setSubmitted(true);
      return;
    }

    if (!isLastQuestion) {
      setQIndex((prev) => prev + 1);
      setSelectedOpt(null);
      setSubmitted(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const finalScore = Math.round((correctCount / chapter.quiz.length) * 100);
      const finalPassed = finalScore >= 75;
      onRecordQuizResult(chapter.id, finalScore, finalPassed);
      setQuizDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAF9F6' }}>
      {/* Верхняя панель (TopBar) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backgroundColor: '#06372C',
          color: '#FEF3C7',
          borderBottom: '1px solid rgba(180, 83, 9, 0.35)',
        }}
      >
        <div
          style={{
            maxWidth: '720px',
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => onBackToChapter(false)}
            className="cursor-pointer whitespace-nowrap shrink-0"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FEF3C7',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 12px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            ← К главе
          </button>

          <div
            className="tabular-nums"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            Вопрос {qIndex + 1} из {chapter.quiz.length}
          </div>

          <div
            className="tabular-nums whitespace-nowrap shrink-0"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#FDE68A',
            }}
          >
            Верно: {correctCount}
          </div>
        </div>
      </header>

      {/* Карточка вопроса (.card) */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '16px' }}>
        <div className="card">
          {/* Надзаголовок */}
          <div
            style={{
              fontSize: '12px',
              color: '#64748B',
              marginBottom: '8px',
            }}
          >
            {book.title} · {chapter.title}
          </div>

          {/* Текст вопроса */}
          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              lineHeight: 1.35,
              color: '#0F172A',
              marginBottom: '16px',
            }}
          >
            {formatMixedArabicHtml(q.question, 18, arabicScale, [])}
          </div>

          {/* Список вариантов ответа */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {q.options.map((optText, i) => {
              let optionClass = 'option-btn';
              if (!submitted) {
                if (selectedOpt === i) {
                  optionClass += ' option-selected';
                }
              } else {
                if (i === q.correctAnswerIndex) {
                  optionClass += ' option-correct';
                } else if (i === selectedOpt) {
                  optionClass += ' option-wrong';
                }
              }

              return (
                <button
                  key={i}
                  type="button"
                  disabled={submitted}
                  onClick={() => {
                    if (!submitted) {
                      setSelectedOpt(i);
                    }
                  }}
                  className={optionClass}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {OPTION_LETTERS[i] ?? `${i + 1}.`}
                  </span>
                  <span style={{ flex: 1 }}>
                    {formatMixedArabicHtml(optText, 15, arabicScale, [])}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Блок пояснения */}
          {submitted && q.explanation && q.explanation.trim().length > 0 && (
            <div className="explanation-box">
              <b>Пояснение:</b>{' '}
              <span style={{ display: 'inline' }}>
                {formatMixedArabicHtml(q.explanation, 14, arabicScale, [])}
              </span>
            </div>
          )}

          {/* Нижняя кнопка действия */}
          <button
            type="button"
            disabled={!submitted && selectedOpt === null}
            onClick={handleSubmitOrNext}
            className="cursor-pointer disabled:opacity-45"
            style={{
              width: '100%',
              marginTop: '16px',
              backgroundColor: '#06372C',
              color: '#FEF3C7',
              border: 'none',
              borderRadius: '12px',
              padding: '14px 16px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            {!submitted
              ? 'Проверить ответ'
              : !isLastQuestion
              ? 'Следующий вопрос →'
              : 'Завершить тест'}
          </button>
        </div>
      </main>
    </div>
  );
};
