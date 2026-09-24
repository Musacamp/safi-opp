import { createContext, useContext, useState, type ReactNode } from "react";

export type Screen =
  | "dashboard"
  | "contacts"
  | "today"
  | "vacancies"
  | "more"
  | "due-today"
  | "overdue"
  | "called-today"
  | "add-landlord"
  | "import-contacts"
  | "contact-detail"
  | "what-happened";

interface AppContextValue {
  screen: Screen;
  params: Record<string, string>;
  navigate: (screen: Screen, params?: Record<string, string>) => void;
  goBack: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface HistoryEntry {
  screen: Screen;
  params: Record<string, string>;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { screen: "dashboard", params: {} },
  ]);

  const current = history[history.length - 1];

  const navigate = (screen: Screen, params: Record<string, string> = {}) => {
    setHistory((prev) => [...prev, { screen, params }]);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    window.scrollTo(0, 0);
  };

  return (
    <AppContext.Provider
      value={{ screen: current.screen, params: current.params, navigate, goBack }}
    >
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
