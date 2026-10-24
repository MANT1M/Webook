import React, { useState, useEffect } from 'react';
import { ChapterFootnote } from '../types/reader';
import { ThemeConfig } from '../constants/theme';
import { formatMixedArabicHtml } from '../utils/arabicFormatter';

export interface FootnotePopupProps {
  activeFn: ChapterFootnote | null;
  theme: ThemeConfig;
  fontSize: number;
  arabicScale: number;
  onClose: () => void;
}

export const FootnotePopup: React.FC<FootnotePopupProps> = ({
  activeFn,
  theme,
  fontSize,
  arabicScale,
  onClose,
}) => {
  // Локальный размер шрифта для сноски, синхронизированный с базовым размером шрифта читалки
  const [localFontSize, setLocalFontSize] = useState<number>(() => Math.max(17, fontSize));

  useEffect(() => {
    setLocalFontSize(Math.max(17, fontSize));
  }, [fontSize, activeFn?.id]);

  if (!activeFn) {
    return null;
  }

  const stopEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  const handleZoomOut = () => {
    setLocalFontSize((prev) => Math.max(14, prev - 1));
  };

  const handleZoomIn = () => {
    setLocalFontSize((prev) => Math.min(26, prev + 1));
  };

  return (
    <div
      className="fn-popup"
      onClick={stopEvent}
      onTouchStart={stopEvent}
      onTouchMove={stopEvent}
      onTouchEnd={stopEvent}
      role="region"
      aria-label={`Сноска ${activeFn.id}`}
      style={{
        background: theme.surface,
        color: theme.fg,
        marginTop: '12px',
        padding: '16px 18px',
        borderRadius: '16px',
        border: '1.5px solid rgba(180, 83, 9, 0.45)',
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18), 0 2px 6px -1px rgba(180, 83, 9, 0.15)',
        maxHeight: '44vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'all 0.2s ease-in-out',
      }}
    >
      {/* Шапка сноски: номер, управление размером шрифта и кнопка закрытия */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(180, 83, 9, 0.25)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#B45309',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              padding: '2px 8px',
              borderRadius: '6px',
            }}
          >
            [{activeFn.id}]
          </span>
          <strong
            style={{
              color: '#B45309',
              fontWeight: 700,
              fontSize: '15px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Сноска к тексту
          </strong>
        </div>

        {/* Быстрое управление размером шрифта сноски */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'rgba(180, 83, 9, 0.12)',
              borderRadius: '8px',
              padding: '2px 4px',
            }}
          >
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={localFontSize <= 14}
              title="Уменьшить шрифт сноски"
              aria-label="Уменьшить шрифт сноски"
              className="cursor-pointer disabled:opacity-40"
              style={{
                background: 'none',
                border: 'none',
                color: theme.fg,
                fontSize: '13px',
                fontWeight: 700,
                padding: '4px 7px',
                borderRadius: '6px',
              }}
            >
              А-
            </button>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#B45309',
                minWidth: '22px',
                textAlign: 'center',
              }}
            >
              {localFontSize}
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={localFontSize >= 26}
              title="Увеличить шрифт сноски"
              aria-label="Увеличить шрифт сноски"
              className="cursor-pointer disabled:opacity-40"
              style={{
                background: 'none',
                border: 'none',
                color: theme.fg,
                fontSize: '14px',
                fontWeight: 700,
                padding: '4px 7px',
                borderRadius: '6px',
              }}
            >
              А+
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="cursor-pointer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 12px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid rgba(180, 83, 9, 0.35)',
              background: '#B45309',
              color: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            ✕ Закрыть
          </button>
        </div>
      </div>

      {/* Текст сноски с комфортным масштабированием и читаемым интервалом */}
      <div
        style={{
          fontSize: `${localFontSize}px`,
          lineHeight: 1.62,
          fontFamily: 'Georgia, "Lora", serif',
          wordBreak: 'break-word',
          letterSpacing: '0.01em',
        }}
      >
        {formatMixedArabicHtml(activeFn.text, localFontSize, arabicScale, [])}
      </div>
    </div>
  );
};

