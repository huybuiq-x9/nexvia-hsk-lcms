import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapsibleDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  openLabel?: string;
  closeLabel?: string;
}

export function CollapsibleDrawer({
  isOpen,
  onToggle,
  children,
  openLabel = 'Open information',
  closeLabel = 'Close information',
}: CollapsibleDrawerProps) {
  const drawerWidth = 'min(24rem, calc(100vw - 4rem))';

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? closeLabel : openLabel}
        aria-expanded={isOpen}
        className="fixed top-1/2 z-[60] flex h-12 w-7 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-slate-200 bg-white text-slate-500 shadow-md transition-all hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ right: isOpen ? drawerWidth : 0 }}
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
