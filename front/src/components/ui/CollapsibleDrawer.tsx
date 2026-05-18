import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapsibleDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  openLabel?: string;
  closeLabel?: string;
}

const DRAWER_TOP_OFFSET = 56;
const HANDLE_HEIGHT = 48;
const HANDLE_MARGIN = 16;
const DRAG_THRESHOLD = 4;

function clampHandleTop(top: number) {
  const minTop = DRAWER_TOP_OFFSET + HANDLE_MARGIN + HANDLE_HEIGHT / 2;
  const maxTop = window.innerHeight - HANDLE_MARGIN - HANDLE_HEIGHT / 2;
  return Math.min(Math.max(top, minTop), Math.max(minTop, maxTop));
}

export function CollapsibleDrawer({
  isOpen,
  onToggle,
  children,
  openLabel = 'Open information',
  closeLabel = 'Close information',
}: CollapsibleDrawerProps) {
  const drawerWidth = 'min(24rem, calc(100vw - 4rem))';
  const [handleTop, setHandleTop] = useState<number | null>(null);
  const dragRef = useRef<{ pointerId: number; startY: number; startTop: number } | null>(null);
  const didDragRef = useRef(false);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setHandleTop(current => (current === null ? current : clampHandleTop(current)));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTop: rect.top + rect.height / 2,
    };
    didDragRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaY) > DRAG_THRESHOLD) {
      didDragRef.current = true;
      suppressClickRef.current = true;
    }

    if (!didDragRef.current) return;

    event.preventDefault();
    setHandleTop(clampHandleTop(drag.startTop + deltaY));
  };

  const handlePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onToggle();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-label={isOpen ? closeLabel : openLabel}
        aria-expanded={isOpen}
        className="fixed z-[60] flex h-12 w-7 -translate-y-1/2 touch-none select-none items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-slate-500 shadow-md transition-[right,color,box-shadow] hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-grab active:cursor-grabbing"
        style={{
          right: isOpen ? drawerWidth : 0,
          top: handleTop === null ? '50%' : `${handleTop}px`,
        }}
      >
        {isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <aside
        className={`fixed bottom-0 right-0 top-14 z-50 overflow-y-auto border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: drawerWidth }}
      >
        {children}
      </aside>
    </>
  );
}
