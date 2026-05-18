import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  pageTitle: string;
  pageSubtitle: string;
  setPageHeader: (title: string, subtitle?: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
  pageTitle: '',
  pageSubtitle: '',
  setPageHeader: () => {},
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');

  const setPageHeader = useCallback((title: string, subtitle = '') => {
    setPageTitle(title);
    setPageSubtitle(subtitle);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs, pageTitle, pageSubtitle, setPageHeader }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext);
}

export function useSetBreadcrumbs() {
  return useContext(BreadcrumbContext).setBreadcrumbs;
}
