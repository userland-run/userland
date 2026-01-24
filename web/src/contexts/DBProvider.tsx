import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DBContextValue {
  isReady: boolean;
  error: Error | null;
}

const DBContext = createContext<DBContextValue>({
  isReady: false,
  error: null,
});

export function DBProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [error] = useState<Error | null>(null);

  useEffect(() => {
    // DuckDB disabled for now - will enable later
    // For now, just mark as ready without actually loading DuckDB
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <DBContext.Provider value={{ isReady, error }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDBContext() {
  return useContext(DBContext);
}
