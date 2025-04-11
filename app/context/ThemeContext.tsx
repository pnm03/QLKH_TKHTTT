'use client'

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react'

interface ThemeColor {
  name: string;
  mainBg: string;
  darkBg: string;
  hoverBg: string;
  textColor: string;
  lightTextColor: string;
  borderColor: string;
  buttonBg: string;
  buttonHoverBg: string;
}

interface ThemeContextType {
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  themeColors: Record<string, ThemeColor>;
  currentTheme: ThemeColor;
}

const themeColors: Record<string, ThemeColor> = {
  blue: {
    name: 'Xanh dương',
    mainBg: 'bg-blue-500',
    darkBg: 'bg-blue-600',
    hoverBg: 'hover:bg-blue-400',
    textColor: 'text-blue-500',
    lightTextColor: 'text-white',
    borderColor: 'border-blue-600',
    buttonBg: 'bg-blue-500',
    buttonHoverBg: 'hover:bg-blue-600',
  },
  slate: {
    name: 'Xám đá',
    mainBg: 'bg-slate-500',
    darkBg: 'bg-slate-600',
    hoverBg: 'hover:bg-slate-400',
    textColor: 'text-slate-500',
    lightTextColor: 'text-white',
    borderColor: 'border-slate-600',
    buttonBg: 'bg-slate-500',
    buttonHoverBg: 'hover:bg-slate-600',
  },
  green: {
    name: 'Xanh lá',
    mainBg: 'bg-green-500',
    darkBg: 'bg-green-600',
    hoverBg: 'hover:bg-green-400',
    textColor: 'text-green-500',
    lightTextColor: 'text-white',
    borderColor: 'border-green-600',
    buttonBg: 'bg-green-500',
    buttonHoverBg: 'hover:bg-green-600',
  },
  purple: {
    name: 'Tím',
    mainBg: 'bg-purple-500',
    darkBg: 'bg-purple-600',
    hoverBg: 'hover:bg-purple-400',
    textColor: 'text-purple-500',
    lightTextColor: 'text-white',
    borderColor: 'border-purple-600',
    buttonBg: 'bg-purple-500',
    buttonHoverBg: 'hover:bg-purple-600',
  },
  rose: {
    name: 'Đỏ hồng',
    mainBg: 'bg-rose-500',
    darkBg: 'bg-rose-600',
    hoverBg: 'hover:bg-rose-400',
    textColor: 'text-rose-500',
    lightTextColor: 'text-white',
    borderColor: 'border-rose-600',
    buttonBg: 'bg-rose-500',
    buttonHoverBg: 'hover:bg-rose-600',
  },
  teal: {
    name: 'Xanh ngọc',
    mainBg: 'bg-teal-500',
    darkBg: 'bg-teal-600',
    hoverBg: 'hover:bg-teal-400',
    textColor: 'text-teal-500',
    lightTextColor: 'text-white',
    borderColor: 'border-teal-600',
    buttonBg: 'bg-teal-500',
    buttonHoverBg: 'hover:bg-teal-600',
  },
  emerald: {
    name: 'Ngọc lục bảo',
    mainBg: 'bg-emerald-500',
    darkBg: 'bg-emerald-600',
    hoverBg: 'hover:bg-emerald-400',
    textColor: 'text-emerald-500',
    lightTextColor: 'text-white',
    borderColor: 'border-emerald-600',
    buttonBg: 'bg-emerald-500',
    buttonHoverBg: 'hover:bg-emerald-600',
  },
  orange: {
    name: 'Cam',
    mainBg: 'bg-orange-500',
    darkBg: 'bg-orange-600',
    hoverBg: 'hover:bg-orange-400',
    textColor: 'text-orange-500',
    lightTextColor: 'text-white',
    borderColor: 'border-orange-600',
    buttonBg: 'bg-orange-500',
    buttonHoverBg: 'hover:bg-orange-600',
  },
  fuchsia: {
    name: 'Hồng tím',
    mainBg: 'bg-fuchsia-500',
    darkBg: 'bg-fuchsia-600',
    hoverBg: 'hover:bg-fuchsia-400',
    textColor: 'text-fuchsia-500',
    lightTextColor: 'text-white',
    borderColor: 'border-fuchsia-600',
    buttonBg: 'bg-fuchsia-500',
    buttonHoverBg: 'hover:bg-fuchsia-600',
  },
};

// Tạo context với giá trị default
const defaultTheme = 'blue';
const defaultContextValue: ThemeContextType = {
  selectedTheme: defaultTheme,
  setSelectedTheme: () => {},
  themeColors,
  currentTheme: themeColors[defaultTheme],
};

const ThemeContext = createContext<ThemeContextType>(defaultContextValue);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [selectedTheme, setSelectedTheme] = useState<string>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  const handleSetSelectedTheme = (theme: string) => {
    setSelectedTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('qlbh-theme', theme);
    }
  };

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('qlbh-theme');
    if (savedTheme && themeColors[savedTheme]) {
      setSelectedTheme(savedTheme);
    }
  }, []);

  const contextValue = {
    selectedTheme,
    setSelectedTheme: handleSetSelectedTheme,
    themeColors,
    currentTheme: themeColors[selectedTheme],
  };

  // Chỉ trả về children trong quá trình server-side rendering
  // hoặc trong lần render đầu tiên ở client
  if (!mounted) {
    return (
      <ThemeContext.Provider value={defaultContextValue}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { themeColors }; 