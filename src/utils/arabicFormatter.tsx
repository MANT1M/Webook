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
  keyPrefix: string
): React.ReactNode[] {
  if (!segment) return [];

  const parts = segment.split(ARABIC_WORD_TASHKEEL_RE);
  const scaledSize = `${(baseFontSize * arabicScale).toFixed(1)}px`;

  return parts.map((part, idx) => {
    if (!part) return null;
    if (ARABIC_TEST_RE.test(part)) {
      return (
        <span
          key={`${keyPrefix}-ar-${idx}`}
          className="font-arabic"
          style={{ fontSize: scaledSize }}
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
            `l${lineIdx}-p${lastIndex}`
          )
        );
      }

      if (footnoteIds.has(fnNumber) && onToggleFootnote) {
        const isOpen = activeFnId === fnNumber;
        nodes.push(
          <button
            key={`l${lineIdx}-fn-${fnNumber}-${matchStart}`}
            type="button"
            className="fn-badge"
            aria-expanded={isOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFootnote(fnNumber);
            }}
            style={{
              padding: '1px 5px',
              margin: '0 2px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              borderRadius: '5px',
              background: isOpen
                ? 'rgba(245, 158, 11, 0.38)'
                : 'rgba(245, 158, 11, 0.22)',
              color: '#B45309',
              border: '1px solid rgba(180, 83, 9, 0.4)',
              verticalAlign: 'super',
              cursor: 'pointer',
              lineHeight: 1.2,
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
            `l${lineIdx}-rawfn-${matchStart}`
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
          `l${lineIdx}-end`
        )
      );
    }

    return (
      <p
        key={`line-${lineIdx}`}
        dir={isPureArabic ? 'rtl' : 'ltr'}
        style={{
          textAlign: isPureArabic ? 'right' : 'left',
          margin: lines.length === 1 ? 0 : '0 0 0.65em 0',
          wordBreak: 'break-word',
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
