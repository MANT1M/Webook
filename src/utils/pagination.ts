export interface PageSlice {
  start: number;
  end: number;
  text: string;
}

const ARABIC_CHAR_RE =
  /[\u0610-\u061A\u0620-\u065F\u066E-\u06D3\u06D5-\u06ED\u0640\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

interface VisualLine {
  start: number;
  end: number;
  cost: number;
}

/**
 * Разбивает текст главы на страницы с учетом размера шрифта,
 * масштаба арабской вязи и размеров вьюпорта без разрыва слов.
 */
export function paginate(
  text: string,
  fontSize: number,
  arabicScale: number,
  viewportWidth: number,
  viewportHeight: number
): PageSlice[] {
  if (!text || text.length === 0) {
    return [{ start: 0, end: 0, text: '' }];
  }

  const w = Math.max(280, Math.min(viewportWidth, 720) - 44);
  const h = Math.max(260, viewportHeight - 190);
  const charsPerLine = Math.max(22, Math.floor(w / (fontSize * 0.55)));
  const baseLineHeightFactor = 1.6;
  const maxLines = Math.max(5, Math.floor(h / (fontSize * baseLineHeightFactor)));

  const visualLines: VisualLine[] = [];
  const totalLen = text.length;
  let pos = 0;

  while (pos < totalLen) {
    const nextNewline = text.indexOf('\n', pos);
    const paraEnd = nextNewline === -1 ? totalLen : nextNewline;
    const hasNewline = nextNewline !== -1;

    if (paraEnd === pos) {
      // Пустая строка (перенос абзаца)
      visualLines.push({
        start: pos,
        end: pos + 1,
        cost: 0.35,
      });
      pos += 1;
      continue;
    }

    let lineStart = pos;
    while (lineStart < paraEnd) {
      while (lineStart < paraEnd && text[lineStart] === ' ') {
        lineStart++;
      }
      if (lineStart >= paraEnd) break;

      let lineEnd = Math.min(paraEnd, lineStart + charsPerLine);

      if (lineEnd < paraEnd) {
        // Не разрываем слово посередине
        let lastSpace = text.lastIndexOf(' ', lineEnd);
        if (lastSpace <= lineStart) {
          const nextSpace = text.indexOf(' ', lineEnd);
          lineEnd =
            nextSpace === -1 || nextSpace > paraEnd ? paraEnd : nextSpace;
        } else {
          lineEnd = lastSpace;
        }
      }

      const isLastLineOfParagraph = lineEnd >= paraEnd;
      const sliceEnd =
        isLastLineOfParagraph && hasNewline ? paraEnd + 1 : lineEnd;
      const lineSubstr = text.slice(lineStart, lineEnd);
      const hasArabic = ARABIC_CHAR_RE.test(lineSubstr);
      const hasCyrillicOrLatin = /[А-Яа-яЁёA-Za-z]/.test(lineSubstr);
      const isPureArabic = hasArabic && !hasCyrillicOrLatin;

      // Только строки, реально содержащие арабский текст, увеличивают высоту строки
      let cost = 1.0;
      if (isPureArabic) {
        cost = Math.max(1.2, arabicScale * 0.85);
      } else if (hasArabic && arabicScale > 1.25) {
        cost = Math.min(1.35, 1.0 + (arabicScale - 1) * 0.2);
      }

      if (isLastLineOfParagraph && hasNewline) {
        cost += 0.35;
      }

      visualLines.push({
        start: lineStart,
        end: sliceEnd,
        cost,
      });

      lineStart = lineEnd;
    }

    pos = hasNewline ? paraEnd + 1 : paraEnd;
  }

  if (visualLines.length === 0) {
    return [{ start: 0, end: totalLen, text }];
  }

  const pages: PageSlice[] = [];
  let pageStart = visualLines[0].start;
  let pageEnd = visualLines[0].end;
  let currentLinesCount = 0;

  for (let i = 0; i < visualLines.length; i++) {
    const vLine = visualLines[i];
    if (currentLinesCount > 0 && currentLinesCount + vLine.cost > maxLines) {
      const sliceText = text.slice(pageStart, pageEnd).replace(/^\n+|\n+$/g, '');
      pages.push({
        start: pageStart,
        end: pageEnd,
        text: sliceText,
      });
      pageStart = vLine.start;
      pageEnd = vLine.end;
      currentLinesCount = vLine.cost;
    } else {
      pageEnd = vLine.end;
      currentLinesCount += vLine.cost;
    }
  }

  if (pageEnd > pageStart || pages.length === 0) {
    const sliceText = text.slice(pageStart, pageEnd).replace(/^\n+|\n+$/g, '');
    pages.push({
      start: pageStart,
      end: pageEnd,
      text: sliceText,
    });
  }

  return pages;
}

/**
 * Находит индекс страницы, содержащей сохраненный символьный индекс charOffset.
 */
export function findPageIndexByOffset(
  pages: PageSlice[],
  charOffset: number
): number {
  if (!pages.length || charOffset <= 0) return 0;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (charOffset >= page.start && charOffset < page.end) {
      return i;
    }
  }

  if (charOffset >= pages[pages.length - 1].start) {
    return pages.length - 1;
  }

  return 0;
}
