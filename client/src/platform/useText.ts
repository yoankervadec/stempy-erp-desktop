import { useCallback } from 'react'
import { text, type TextKey } from './i18n'
import { useLanguage } from './meta'

/** The client's own texts in the current language: `const t = useText(); t('retry')`. */
export function useText(): (key: TextKey, params?: Record<string, string | number>) => string {
  const language = useLanguage()
  return useCallback((key, params) => text(language, key, params), [language])
}
