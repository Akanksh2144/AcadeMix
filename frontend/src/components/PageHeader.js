import React from 'react';
import { ArrowLeft, BookOpen, Sun, Moon, SignOut } from '@phosphor-icons/react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Lightweight sub-page header.
 * Shows: back button + AcadMix logo + title/subtitle on the left,
 * optional action buttons + theme toggle + logout icon on the right.
 * User details card is intentionally omitted — only main dashboards show it.
 *
 * Props:
 *   - navigate(page)   — navigation callback
 *   - user             — current user object (used for role-based back navigation)
 *   - onLogout         — logout callback (optional, hides sign-out if absent)
 *   - title            — page title (e.g. "Available Quizzes")
 *   - subtitle         — small text under the title (optional)
 *   - backTo           — page key to navigate back (auto-resolved from user.role if omitted)
 *   - rightContent     — extra JSX to render (e.g. action buttons)
 *   - maxWidth         — max-width class (default: "max-w-7xl")
 */
const PageHeader = ({ navigate, user, onLogout, title, subtitle, backTo, rightContent, maxWidth }) => {
  const { isDark, toggle: toggleTheme } = useTheme();

  const defaultBack = {
    student: 'student-dashboard', teacher: 'teacher-dashboard', admin: 'admin-dashboard',
    hod: 'hod-dashboard', exam_cell: 'examcell-dashboard', tpo: 'tpo-dashboard',
    parent: 'parent-dashboard', alumni: 'alumni-dashboard', principal: 'principal-dashboard',
  }[user?.role] || 'student-dashboard';

  const goBack = backTo || defaultBack;
  const mw = maxWidth || 'max-w-7xl';

  return (
    <header className="glass-header border-b border-slate-200/50 dark:border-slate-800/50">
      <div className="w-full px-2 sm:px-3 py-3 flex items-center">
        {/* Back button — pinned to far-left edge */}
        <button
          data-testid="back-button"
          onClick={() => navigate(goBack)}
          className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft size={20} weight="bold" />
        </button>

        {/* Logo + Title */}
        <div className="flex items-center gap-3 ml-3 min-w-0">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} weight="duotone" className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">{title || 'AcadMix'}</h1>
            {subtitle && (
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: action buttons + theme toggle + logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {rightContent}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
          </button>

          {/* Logout icon — pinned to far-right edge */}
          {onLogout && (
            <button
              data-testid="logout-button"
              onClick={onLogout}
              className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 transition-colors"
              aria-label="Sign out"
            >
              <SignOut size={20} weight="duotone" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
