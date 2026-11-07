import React from 'react';
import { ChapterFootnote } from '../types/reader';

export const ARABIC_WORD_TASHKEEL_RE =
  /([\u0610-\u061A\u0620-\u065F\u066E-\u06D3\u06D5-\u06ED\u0640\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;

const ARABIC_TEST_RE =
  /[\u0610-\u061A\u0620-\u065F\u066E-\u06D3\u06D5-\u06ED\u0640\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

const FOOTNOTE_MARKER_RE = /\[(\d+)\]/g;

/**
 * Проверяет, является ли строка чисто арабской (содержит арабские символы и не содержит кириллицу/латиницу).
 */
export function isArabicParagraphLine(line: string): boolean {
  return ARABIC_TEST_RE.test(line) && !/[А-Яа-яЁёA-Za-z]/.test(line);
}

/**
 * Форматирует текстовый сегмент без маркеров сносок, оборачивая арабские фрагменты
 * с огласовками (харакатами) в увеличенный span согласно arabicScale.
 */
function renderArabicScaledSegment(
  segment: string,
  baseFontSize: number,
  arabicScale: number,
  keyPrefix: string,
  isPureArabic = false
): React.ReactNode[] {
  if (!segment) return [];

  const parts = segment.split(ARABIC_WORD_TASHKEEL_RE);
  const scaledSize = `${(baseFontSize * arabicScale).toFixed(1)}px`;
  const spanLineHeight = isPureArabic
    ? 2.15
    : arabicScale > 1.25
      ? 1.95
      : 1.75;

  return parts.map((part, idx) => {
    if (!part) return null;
    if (ARABIC_TEST_RE.test(part)) {
      return (
        <span
          key={`${keyPrefix}-ar-${idx}`}
          className="font-arabic"
          style={{
            fontSize: scaledSize,
            lineHeight: spanLineHeight,
            display: 'inline',
          }}
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={`${keyPrefix}-tx-${idx}`}>{part}</React.Fragment>;
  });
}

export interface FormatPageTextOptions {
  text: string;
  baseFontSize: number;
  arabicScale: number;
  footnotes?: ChapterFootnote[];
  activeFnId?: number | null;
  onToggleFootnote?: (fnId: number) => void;
}

/**
 * Универсальная функция форматирования смешанного русско-арабского текста и маркеров сносок.
 * Используется как для основного текста страницы, так и внутри попапа сноски:
 * formatMixedArabicHtml(activeFn.text, 14, arabicScale, [])
 */
export function formatMixedArabicHtml(
  text: string,
  baseFontSize: number,
  arabicScale: number,
  footnotes: ChapterFootnote[] = [],
  activeFnId: number | null = null,
  onToggleFootnote?: (fnId: number) => void
): React.ReactNode {
  const footnoteIds = new Set(footnotes.map((fn) => fn.id));
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    if (line.trim() === '') {
      return <div key={`empty-${lineIdx}`} style={{ height: '0.55em' }} />;
    }

    const isPureArabic = isArabicParagraphLine(line);
    const nodes: React.ReactNode[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    FOOTNOTE_MARKER_RE.lastIndex = 0;

    while ((match = FOOTNOTE_MARKER_RE.exec(line)) !== null) {
      const matchStart = match.index;
      const fullMatch = match[0];
      const fnNumber = Number(match[1]);

      if (matchStart > lastIndex) {
        const beforeText = line.slice(lastIndex, matchStart);
        nodes.push(
          ...renderArabicScaledSegment(
            beforeText,
            baseFontSize,
            arabicScale,
            `l${lineIdx}-p${lastIndex}`,
            isPureArabic
          )
        );
      }

      if (footnoteIds.has(fnNumber) && onToggleFootnote) {
        const isOpen = activeFnId === fnNumber;
        const badgeFontSize = Math.max(12, Math.round(baseFontSize * 0.7));
        nodes.push(
          <button
            key={`l${lineIdx}-fn-${fnNumber}-${matchStart}`}
            type="button"
            className="fn-badge"
            aria-expanded={isOpen}
            title={isOpen ? `Закрыть сноску ${fnNumber}` : `Открыть сноску ${fnNumber}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFootnote(fnNumber);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 7px',
              margin: '0 3px',
              fontSize: `${badgeFontSize}px`,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontWeight: 700,
              borderRadius: '6px',
              background: isOpen
                ? '#B45309'
                : 'rgba(245, 158, 11, 0.24)',
              color: isOpen ? '#FFFFFF' : '#B45309',
              border: isOpen
                ? '1px solid #92400E'
                : '1px solid rgba(180, 83, 9, 0.45)',
              boxShadow: isOpen
                ? '0 0 0 2px rgba(245, 158, 11, 0.4)'
                : 'none',
              verticalAlign: 'baseline',
              position: 'relative',
              top: '-0.25em',
              cursor: 'pointer',
              lineHeight: 1.1,
              touchAction: 'manipulation',
            }}
          >
            [{fnNumber}]
          </button>
        );
      } else {
        nodes.push(
          ...renderArabicScaledSegment(
            fullMatch,
            baseFontSize,
            arabicScale,
            `l${lineIdx}-rawfn-${matchStart}`,
            isPureArabic
          )
        );
      }

      lastIndex = matchStart + fullMatch.length;
    }

    if (lastIndex < line.length) {
      const remaining = line.slice(lastIndex);
      nodes.push(
        ...renderArabicScaledSegment(
          remaining,
          baseFontSize,
          arabicScale,
          `l${lineIdx}-end`,
          isPureArabic
        )
      );
    }

    const hasArabicInLine = ARABIC_TEST_RE.test(line);

    // Межстрочный интервал абзаца:
    // - Чисто русский абзац ВСЕГДА сохраняет фиксированный комфортный интервал 1.6
    // - Чисто арабский блок (аят, дуа) получает просторный интервал 2.15 от масштабированного размера, чтобы огласовки не наслаивались
    // - Смешанный текст со вставкой арабского слова получает плавную коррекцию
    let paragraphLineHeight = '1.6';
    if (isPureArabic) {
      paragraphLineHeight = '2.15';
    } else if (hasArabicInLine && arabicScale > 1.2) {
      paragraphLineHeight = `${Math.min(2.0, 1.65 + (arabicScale - 1) * 0.22).toFixed(2)}`;
    }

    return (
      <p
        key={`line-${lineIdx}`}
        dir={isPureArabic ? 'rtl' : 'ltr'}
        style={{
          textAlign: isPureArabic ? 'right' : 'left',
          margin: lines.length === 1 ? 0 : isPureArabic ? '0.35em 0 0.85em 0' : '0 0 0.65em 0',
          wordBreak: 'break-word',
          lineHeight: paragraphLineHeight,
          ...(isPureArabic ? { padding: '6px 0' } : {}),
        }}
      >
        {nodes}
      </p>
    );
  });
}

/**
 * Обертка с именованными параметрами для удобного вызова из ReaderScreen.
 */
export function formatReaderPageContent({
  text,
  baseFontSize,
  arabicScale,
  footnotes = [],
  activeFnId = null,
  onToggleFootnote,
}: FormatPageTextOptions): React.ReactNode {
  return formatMixedArabicHtml(
    text,
    baseFontSize,
    arabicScale,
    footnotes,
    activeFnId,
    onToggleFootnote
  );
}
