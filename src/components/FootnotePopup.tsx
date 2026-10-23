import React from 'react';
import { ChapterFootnote } from '../types/reader';
import { ThemeConfig } from '../constants/theme';
import { formatMixedArabicHtml } from '../utils/arabicFormatter';

export interface FootnotePopupProps {
  activeFn: ChapterFootnote | null;
  theme: ThemeConfig;
  arabicScale: number;
  onClose: () => void;
}

export const FootnotePopup: React.FC<FootnotePopupProps> = ({
  activeFn,
  theme,
  arabicScale,
  onClose,
}) => {
  if (!activeFn) {
    return null;
  }

  const stopEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fn-popup"
      onClick={stopEvent}
      onTouchStart={stopEvent}
      onTouchMove={stopEvent}
      onTouchEnd={stopEvent}
      style={{
        background: theme.surface,
        color: theme.fg,
        marginTop: '10px',
        padding: '12px 14px',
        borderRadius: '12px',
        border: '1px solid rgba(180, 83, 9, 0.35)',
        fontSize: '13px',
        lineHeight: 1.45,
        maxHeight: '36vh',
        overflowY: 'auto',
      }}
    >
      {/* Шапка попапа */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        <strong
          style={{
            color: '#B45309',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          Сноска [{activeFn.id}]
        </strong>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="cursor-pointer"
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid rgba(180, 83, 9, 0.35)',
            background: 'rgba(180, 83, 9, 0.1)',
            color: theme.fg,
          }}
        >
          Закрыть
        </button>
      </div>

      {/* Текст сноски с масштабированием арабских слов и цитат */}
      <div>{formatMixedArabicHtml(activeFn.text, 14, arabicScale, [])}</div>
    </div>
  );
};
