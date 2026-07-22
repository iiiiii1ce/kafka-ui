import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './resources/en';
import zhCN from './resources/zhCN';

export const LANGUAGE_STORAGE_KEY = 'kafbat-ui-language';
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const normalizeLanguage = (language?: string): SupportedLanguage =>
  language?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';

const readStoredLanguage = (): SupportedLanguage | undefined => {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage ? normalizeLanguage(storedLanguage) : undefined;
  } catch {
    return undefined;
  }
};

export const getInitialLanguage = (): SupportedLanguage => {
  const storedLanguage = readStoredLanguage();
  if (storedLanguage) return storedLanguage;

  const browserLanguage =
    window.navigator.languages?.[0] || window.navigator.language;
  return normalizeLanguage(browserLanguage);
};

const applyLanguage = (language: string) => {
  const normalizedLanguage = normalizeLanguage(language);
  document.documentElement.lang = normalizedLanguage;

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
  } catch {
    // The app can still switch languages when browser storage is unavailable.
  }
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-CN': { translation: zhCN },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

applyLanguage(i18n.language);
i18n.on('languageChanged', applyLanguage);

export default i18n;
