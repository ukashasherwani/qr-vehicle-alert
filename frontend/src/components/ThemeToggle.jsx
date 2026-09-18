import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ variant = 'floating' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-300 border border-[#888888]/40 hover:border-[#888888] cursor-pointer"
        style={{
          backgroundColor: isDark ? '#242424' : '#FFFFFF',
          color: isDark ? '#E8E8E8' : '#000000',
        }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <>
            <Sun size={15} className="text-[#E8E8E8] transition-transform duration-300 rotate-0 hover:rotate-45" />
            <span>Light Mode (#E8E8E8)</span>
          </>
        ) : (
          <>
            <Moon size={15} className="text-[#000000] transition-transform duration-300 -rotate-12 hover:rotate-0" />
            <span>Dark Mode (#000000)</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 group">
      <button
        type="button"
        onClick={toggleTheme}
        className="flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-[#888888] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        style={{
          backgroundColor: isDark ? '#E8E8E8' : '#000000',
          color: isDark ? '#000000' : '#E8E8E8',
        }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        {isDark ? (
          <Sun size={18} className="transition-transform duration-500 rotate-0 group-hover:rotate-90 text-[#000000]" />
        ) : (
          <Moon size={18} className="transition-transform duration-500 -rotate-12 group-hover:rotate-0 text-[#E8E8E8]" />
        )}
        <span className="text-xs font-bold tracking-wide uppercase">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      </button>
    </div>
  )
}
