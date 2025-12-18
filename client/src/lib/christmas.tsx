import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ChristmasContextType {
  isChristmasMode: boolean;
  toggleChristmasMode: () => void;
  setChristmasMode: (enabled: boolean) => void;
}

const ChristmasContext = createContext<ChristmasContextType | undefined>(undefined);

export function ChristmasProvider({ children }: { children: ReactNode }) {
  const [isChristmasMode, setIsChristmasMode] = useState(false);

  // Check localStorage for saved Christmas mode state
  useEffect(() => {
    const saved = localStorage.getItem('christmasMode');
    if (saved) {
      setIsChristmasMode(JSON.parse(saved));
    }
    // Removed auto-activation in December - only admin can enable
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('christmasMode', JSON.stringify(isChristmasMode));
  }, [isChristmasMode]);

  const toggleChristmasMode = () => {
    setIsChristmasMode(prev => !prev);
  };

  const setChristmasMode = (enabled: boolean) => {
    setIsChristmasMode(enabled);
  };

  return (
    <ChristmasContext.Provider
      value={{
        isChristmasMode,
        toggleChristmasMode,
        setChristmasMode,
      }}
    >
      {children}
    </ChristmasContext.Provider>
  );
}

export function useChristmas() {
  const context = useContext(ChristmasContext);
  if (context === undefined) {
    throw new Error("useChristmas must be used within a ChristmasProvider");
  }
  return context;
}
