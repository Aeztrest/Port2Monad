'use client';

import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers';

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center - could add breadcrumbs here */}
        <div className="flex-1 hidden md:block" />

        {/* Right */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Moon className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          {/* User avatar placeholder */}
          <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-semibold">
            U
          </div>
        </div>
      </div>
    </header>
  );
}
