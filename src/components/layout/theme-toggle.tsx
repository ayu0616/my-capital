import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'

type ThemeMode = 'light' | 'dark' | 'auto'

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  return 'auto'
}

function applyThemeMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode

  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)

  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', mode)
  }
  document.documentElement.style.colorScheme = resolved
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('auto')

  useEffect(() => {
    const initialMode = getInitialMode()
    setMode(initialMode)
    applyThemeMode(initialMode)
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeMode('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  function toggleMode() {
    const nextMode: ThemeMode =
      mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light'
    setMode(nextMode)
    applyThemeMode(nextMode)
    window.localStorage.setItem('theme', nextMode)
  }

  const label =
    mode === 'auto'
      ? 'テーマ: 自動（システムに追従）'
      : mode === 'dark'
        ? 'テーマ: ダーク'
        : 'テーマ: ライト'
  const Icon = mode === 'auto' ? Monitor : mode === 'dark' ? Moon : Sun

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleMode}
      aria-label={`${label}。クリックで切り替え`}
      title={`${label}。クリックで切り替え`}
      className="rounded-full border border-line/80 bg-surface/60"
    >
      <Icon className="size-[0.95rem]" />
    </Button>
  )
}
