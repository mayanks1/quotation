import React, { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';

interface DraggableFabProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  title?: string;
}

export const DraggableFab: React.FC<DraggableFabProps> = ({
  onClick,
  icon = <Plus size={24} className="stroke-[2.5]" />,
  label = 'New Entry',
  title = 'Add New Entry (Drag to move)'
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('tisha_ledger_fab_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(10, window.innerWidth - 70);
          const maxY = Math.max(10, window.innerHeight - 70);
          return {
            x: Math.min(Math.max(10, parsed.x), maxX),
            y: Math.min(Math.max(10, parsed.y), maxY)
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasDraggedRef = useRef(false);
  const isPointerDownRef = useRef(false);
  const dragInfo = useRef({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    pointerId: -1,
  });

  // Keep button within screen on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        if (!prev || !buttonRef.current) return prev;
        const rect = buttonRef.current.getBoundingClientRect();
        const maxX = Math.max(10, window.innerWidth - rect.width - 12);
        const maxY = Math.max(10, window.innerHeight - rect.height - 12);
        return {
          x: Math.min(Math.max(12, prev.x), maxX),
          y: Math.min(Math.max(12, prev.y), maxY)
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only respond to primary click / touch
    if (e.button !== 0) return;

    const btn = buttonRef.current;
    if (!btn) return;

    try {
      btn.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }

    const rect = btn.getBoundingClientRect();
    dragInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      pointerId: e.pointerId,
    };
    isPointerDownRef.current = true;
    hasDraggedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPointerDownRef.current || dragInfo.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragInfo.current.startX;
    const dy = e.clientY - dragInfo.current.startY;
    const distance = Math.hypot(dx, dy);

    // Intentional drag threshold: 10px
    if (distance > 10) {
      hasDraggedRef.current = true;
      if (!isDragging) {
        setIsDragging(true);
      }

      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const maxX = Math.max(12, window.innerWidth - rect.width - 12);
        const maxY = Math.max(12, window.innerHeight - rect.height - 12);

        const nextX = Math.min(Math.max(12, dragInfo.current.initialX + dx), maxX);
        const nextY = Math.min(Math.max(12, dragInfo.current.initialY + dy), maxY);

        setPosition({ x: nextX, y: nextY });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragInfo.current.pointerId !== e.pointerId) return;

    isPointerDownRef.current = false;
    setIsDragging(false);

    const btn = buttonRef.current;
    if (btn) {
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch (err) {
        // ignore
      }
    }

    // If user dragged, save position and prevent immediate click
    if (hasDraggedRef.current) {
      if (position) {
        try {
          localStorage.setItem('tisha_ledger_fab_pos', JSON.stringify(position));
        } catch (err) {
          // ignore
        }
      }
      // Reset after click event has passed
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 150);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragInfo.current.pointerId === e.pointerId) {
      isPointerDownRef.current = false;
      setIsDragging(false);
      hasDraggedRef.current = false;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // If the button was just dragged, ignore this click
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Genuine click/tap -> open modal!
    onClick();
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        ...(position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              right: 'auto',
              bottom: 'auto',
            }
          : {}),
      }}
      className={`fixed ${
        !position ? 'bottom-6 right-6' : ''
      } z-40 flex items-center justify-center w-14 h-14 sm:w-auto sm:h-auto sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_10px_35px_rgba(16,185,129,0.55)] border-2 border-emerald-300/40 cursor-grab active:cursor-grabbing select-none group transition-shadow duration-200 ${
        isDragging
          ? 'scale-110 shadow-[0_16px_45px_rgba(16,185,129,0.75)] ring-4 ring-emerald-400/30'
          : 'hover:scale-105 active:scale-95'
      }`}
      aria-label={label}
      title={title}
    >
      <span className="shrink-0 transition-transform duration-300 group-hover:rotate-90 pointer-events-none">
        {icon}
      </span>
      {label && (
        <span className="hidden sm:inline text-xs font-extrabold tracking-wide uppercase pr-1 pointer-events-none pl-2">
          {label}
        </span>
      )}
    </button>
  );
};
