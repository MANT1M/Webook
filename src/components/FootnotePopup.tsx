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
    <>
      {/* Затемненный фон-подложка: клик по нему закрывает сноску */}
      <div
        className="fn-backdrop"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          zIndex: 60,
        }}
        aria-hidden="true"
      />

      {/* Модальное окно сноски снизу экрана (Fixed Bottom Sheet) */}
      <div
        className="fn-popup"
        onClick={stopEvent}
        onTouchStart={stopEvent}
        onTouchMove={stopEvent}
        onTouchEnd={stopEvent}
        role="dialog"
        aria-modal="true"
        aria-label={`Сноска [${activeFn.id}]`}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          margin: '0 auto',
          maxWidth: '760px',
          maxHeight: '62vh',
          zIndex: 61,
          background: theme.surface,
          color: theme.fg,
          padding: '18px 20px 24px 20px',
          borderRadius: '22px 22px 0 0',
          border: '1.5px solid rgba(180, 83, 9, 0.45)',
          borderBottom: 'none',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.35)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Шапка сноски: номер, управление размером шрифта и кнопка закрытия */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            paddingBottom: '10px',
            borderBottom: '1px solid rgba(180, 83, 9, 0.25)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                padding: '6px 14px',
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
            lineHeight: 1.65,
            fontFamily: 'Georgia, "Lora", serif',
            wordBreak: 'break-word',
            letterSpacing: '0.01em',
          }}
        >
          {formatMixedArabicHtml(activeFn.text, localFontSize, arabicScale, [])}
        </div>
      </div>
    </>
  );
};

