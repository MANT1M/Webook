import React, { useEffect, useRef, useState, useCallback } from 'react';

export interface CustomScrollbarProps {
  mode: 'library' | 'reader';
  pageIndex?: number;
  totalPages?: number;
  onPageChange?: (pageIndex: number) => void;
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({
  mode,
  pageIndex = 0,
  totalPages = 1,
  onPageChange,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const [isActive, setIsActive] = useState<boolean>(false);
  const [thumbStyle, setThumbStyle] = useState<{ top: string; height: string }>({
    top: '0%',
    height: '20%',
  });

  const triggerActive = useCallback(() => {
    setIsActive(true);
    if (fadeTimeoutRef.current !== null) {
      window.clearTimeout(fadeTimeoutRef.current);
    }
    fadeTimeoutRef.current = window.setTimeout(() => {
      if (!isDraggingRef.current) {
        setIsActive(false);
      }
    }, 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  // Mode 1: Library mode synced with window.scrollY and document height
  useEffect(() => {
    if (mode !== 'library') return;

    const updateLibraryScroll = () => {
      const docEl = document.documentElement;
      const scrollTop = window.scrollY || docEl.scrollTop;
      const viewportHeight = window.innerHeight;
      const scrollHeight = Math.max(docEl.scrollHeight, viewportHeight);

      if (scrollHeight <= viewportHeight) {
        setThumbStyle({ top: '0%', height: '100%' });
        return;
      }

      const heightPct = Math.max(12, Math.min(100, (viewportHeight / scrollHeight) * 100));
      const maxScroll = scrollHeight - viewportHeight;
      const scrollRatio = Math.min(1, Math.max(0, scrollTop / maxScroll));
      const topPct = scrollRatio * (100 - heightPct);

      setThumbStyle({
        top: `${topPct.toFixed(2)}%`,
        height: `${heightPct.toFixed(2)}%`,
      });
    };

    const handleScroll = () => {
      updateLibraryScroll();
      triggerActive();
    };

    updateLibraryScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateLibraryScroll);

    const resizeObserver = new ResizeObserver(() => {
      updateLibraryScroll();
    });
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateLibraryScroll);
      resizeObserver.disconnect();
    };
  }, [mode, triggerActive]);

  // Mode 2: Reader mode synced with pageIndex / (totalPages - 1)
  useEffect(() => {
    if (mode !== 'reader') return;

    const safeTotal = Math.max(1, totalPages);
    const safeIndex = Math.min(Math.max(0, pageIndex), safeTotal - 1);

    if (safeTotal <= 1) {
      setThumbStyle({ top: '0%', height: '100%' });
      return;
    }

    const heightPct = Math.max(14, Math.min(100, (1 / safeTotal) * 100));
    const ratio = safeIndex / (safeTotal - 1);
    const topPct = ratio * (100 - heightPct);

    setThumbStyle({
      top: `${topPct.toFixed(2)}%`,
      height: `${heightPct.toFixed(2)}%`,
    });
    triggerActive();
  }, [mode, pageIndex, totalPages, triggerActive]);

  const selectPageFromClientY = useCallback(
    (clientY: number) => {
      if (mode !== 'reader' || !onPageChange || !trackRef.current) return;
      const safeTotal = Math.max(1, totalPages);
      if (safeTotal <= 1) return;

      const rect = trackRef.current.getBoundingClientRect();
      if (rect.height <= 0) return;

      const relativeY = Math.min(Math.max(0, clientY - rect.top), rect.height);
      const ratio = relativeY / rect.height;
      const targetPage = Math.round(ratio * (safeTotal - 1));
      onPageChange(targetPage);
      triggerActive();
    },
    [mode, onPageChange, totalPages, triggerActive]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'reader') return;
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    selectPageFromClientY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'reader' || !isDraggingRef.current) return;
    selectPageFromClientY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mode !== 'reader') return;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      triggerActive();
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mode !== 'reader' || e.touches.length === 0) return;
    selectPageFromClientY(e.touches[0].clientY);
  };

  return (
    <div
      ref={trackRef}
      className={`sb-track ${
        mode === 'library' ? 'sb-track-library' : 'sb-track-reader'
      }`}
      onPointerDown={mode === 'reader' ? handlePointerDown : undefined}
      onPointerMove={mode === 'reader' ? handlePointerMove : undefined}
      onPointerUp={mode === 'reader' ? handlePointerUp : undefined}
      onPointerCancel={mode === 'reader' ? handlePointerUp : undefined}
      onTouchMove={mode === 'reader' ? handleTouchMove : undefined}
      aria-hidden="true"
    >
      <div
        className={`sb-thumb ${isActive ? 'sb-active' : ''}`}
        style={{
          top: thumbStyle.top,
          height: thumbStyle.height,
        }}
      />
    </div>
  );
};
