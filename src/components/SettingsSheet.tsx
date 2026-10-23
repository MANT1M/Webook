import React from 'react';
import { ThemeMode } from '../types/reader';
import { BRAND_COLORS, READER_LIMITS, THEMES } from '../constants/theme';

export interface SettingsSheetProps {
  isOpen: boolean;
  themeMode: ThemeMode;
  fontSize: number;
  arabicScale: number;
  onChangeTheme: (theme: ThemeMode) => void;
  onChangeFontSize: (fontSize: number) => void;
  onChangeArabicScale: (arabicScale: number) => void;
  onClose: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  themeMode,
  fontSize,
  arabicScale,
  onChangeTheme,
  onChangeFontSize,
  onChangeArabicScale,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  const theme = THEMES[themeMode];

  const stopEvent = (e: React.SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="settings-sheet"
      onClick={stopEvent}
      onTouchStart={stopEvent}
      onTouchMove={stopEvent}
      onTouchEnd={stopEvent}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        borderRadius: '20px 20px 0 0',
        padding: '20px',
        background: theme.surface,
        color: theme.fg,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* 1) Шапка */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <strong style={{ fontSize: '16px', fontWeight: 700 }}>
            Настройки чтения
          </strong>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer"
            style={{
              backgroundColor: BRAND_COLORS.primaryBg,
              color: BRAND_COLORS.primaryText,
              border: 'none',
              borderRadius: '10px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Готово
          </button>
        </div>

        {/* 2) Размер основного шрифта */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '14px' }}>
            Размер шрифта: <b>{fontSize} sp</b>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={fontSize <= READER_LIMITS.FONT_SIZE_MIN}
              onClick={() =>
                onChangeFontSize(
                  Math.max(
                    READER_LIMITS.FONT_SIZE_MIN,
                    fontSize - READER_LIMITS.FONT_SIZE_STEP
                  )
                )
              }
              className="cursor-pointer disabled:opacity-40"
              style={{
                backgroundColor: BRAND_COLORS.primaryBg,
                color: BRAND_COLORS.primaryText,
                border: 'none',
                borderRadius: '10px',
                padding: '7px 14px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              А-
            </button>
            <button
              type="button"
              disabled={fontSize >= READER_LIMITS.FONT_SIZE_MAX}
              onClick={() =>
                onChangeFontSize(
                  Math.min(
                    READER_LIMITS.FONT_SIZE_MAX,
                    fontSize + READER_LIMITS.FONT_SIZE_STEP
                  )
                )
              }
              className="cursor-pointer disabled:opacity-40"
              style={{
                backgroundColor: BRAND_COLORS.primaryBg,
                color: BRAND_COLORS.primaryText,
                border: 'none',
                borderRadius: '10px',
                padding: '7px 14px',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              А+
            </button>
          </div>
        </div>

        {/* 3) Масштаб арабской вязи */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '14px' }}>
              Масштаб арабской вязи:{' '}
              <b>
                {arabicScale.toFixed(2)}x ({(fontSize * arabicScale).toFixed(1)}{' '}
                sp)
              </b>
            </span>

            <button
              type="button"
              onClick={() => onChangeArabicScale(1.0)}
              className="cursor-pointer"
              style={{
                background: 'rgba(6, 55, 44, 0.12)',
                color: theme.fg,
                border: '1px solid rgba(180, 83, 9, 0.4)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              1.0x
            </button>
          </div>

          <input
            type="range"
            min="1.0"
            max="2.0"
            step="0.05"
            value={arabicScale}
            onChange={(e) => onChangeArabicScale(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: '#06372C',
            }}
          />
        </div>

        {/* 4) Переключатель темы оформления (LIGHT, SEPIA, NIGHT) */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
          }}
        >
          {(['LIGHT', 'SEPIA', 'NIGHT'] as ThemeMode[]).map((mode) => {
            const modeTheme = THEMES[mode];
            const isActive = themeMode === mode;

            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeTheme(mode)}
                className="cursor-pointer"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: modeTheme.bg,
                  color: modeTheme.fg,
                  border: isActive ? '2px solid #B45309' : '2px solid #94A3B8',
                }}
              >
                {modeTheme.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
