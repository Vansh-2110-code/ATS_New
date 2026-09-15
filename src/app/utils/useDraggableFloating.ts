import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseDraggableFloatingOptions {
  storageKey: string;
  defaultRight: number;
  defaultBottom: number;
  minDistanceToDrag?: number;
}

export function useDraggableFloating({
  storageKey,
  defaultRight,
  defaultBottom,
  minDistanceToDrag = 6,
}: UseDraggableFloatingOptions) {
  const [pos, setPos] = useState<{ right: number; bottom: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.right === 'number' && typeof parsed.bottom === 'number') {
            return parsed;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }
    return { right: defaultRight, bottom: defaultBottom };
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const posRef = useRef(pos);
  posRef.current = pos;

  // Window resize protection to prevent floating widgets from getting pushed off-screen
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => {
        const maxRight = Math.max(12, window.innerWidth - 60);
        const maxBottom = Math.max(12, window.innerHeight - 60);
        const clampedRight = Math.min(Math.max(12, prev.right), maxRight);
        const clampedBottom = Math.min(Math.max(12, prev.bottom), maxBottom);
        if (clampedRight !== prev.right || clampedBottom !== prev.bottom) {
          return { right: clampedRight, bottom: clampedBottom };
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clamp helper when container expands (e.g. chat window opens)
  const clampToBounds = useCallback((width: number, height: number) => {
    if (typeof window === 'undefined') return;
    const maxRight = Math.max(12, window.innerWidth - width - 12);
    const maxBottom = Math.max(12, window.innerHeight - height - 12);
    setPos(prev => {
      const clampedRight = Math.min(Math.max(12, prev.right), maxRight);
      const clampedBottom = Math.min(Math.max(12, prev.bottom), maxBottom);
      if (clampedRight !== prev.right || clampedBottom !== prev.bottom) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({ right: clampedRight, bottom: clampedBottom }));
        } catch (e) {}
        return { right: clampedRight, bottom: clampedBottom };
      }
      return prev;
    });
  }, [storageKey]);

  // Pointer drag starter
  const startDrag = useCallback((e: React.PointerEvent, widgetRef?: React.RefObject<HTMLElement | null>) => {
    // Only primary mouse button or touch
    if (e.button !== 0) return;

    // Do not initiate drag if user clicked an interactive control inside header
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, select')) {
      // Allow drag if the target is marked as a drag handle button (or is the launcher button itself)
      const button = target.closest('button');
      if (button && !button.classList.contains('drag-launcher-btn')) {
        return;
      }
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const initialRight = posRef.current.right;
    const initialBottom = posRef.current.bottom;

    const el = widgetRef?.current || (e.currentTarget as HTMLElement);
    const rect = el.getBoundingClientRect();
    const widgetWidth = rect.width || 60;
    const widgetHeight = rect.height || 60;

    let hasMoved = false;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = startX - moveEvent.clientX; // Moving left increases right offset
      const deltaY = startY - moveEvent.clientY; // Moving up increases bottom offset

      if (!hasMoved && Math.hypot(deltaX, deltaY) > minDistanceToDrag) {
        hasMoved = true;
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (hasMoved) {
        const maxRight = Math.max(12, window.innerWidth - widgetWidth - 12);
        const maxBottom = Math.max(12, window.innerHeight - widgetHeight - 12);

        const newRight = Math.min(Math.max(12, Math.round(initialRight + deltaX)), maxRight);
        const newBottom = Math.min(Math.max(12, Math.round(initialBottom + deltaY)), maxBottom);

        setPos({ right: newRight, bottom: newBottom });
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      if (hasMoved) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(posRef.current));
        } catch (e) {}
        // Retain dragging flag momentarily so any trailing click event is safely ignored
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 80);
      } else {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [minDistanceToDrag, storageKey]);

  return {
    pos,
    setPos,
    isDragging,
    isDraggingRef,
    startDrag,
    clampToBounds,
  };
}
