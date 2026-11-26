import type { Language } from '../api/types'

/**
 * The client's own texts: its chrome only (sign-in form, buttons, loading).
 * Everything the server owns (labels, messages, enum values, confirmations)
 * comes from the server in the user's language and is never translated here.
 */
const TEXTS = {
  appName: { fr: 'Stempy ERP', en: 'Stempy ERP' },
  loading: { fr: 'Chargement...', en: 'Loading...' },
  retry: { fr: 'Réessayer', en: 'Retry' },
  close: { fr: 'Fermer', en: 'Close' },
  signIn: { fr: 'Se connecter', en: 'Sign in' },
  signOut: { fr: 'Se déconnecter', en: 'Sign out' },
  userNo: { fr: "Code d'utilisateur", en: 'User number' },
  password: { fr: 'Mot de passe', en: 'Password' },
  chooseCompany: { fr: 'Choisissez une entreprise', en: 'Choose a company' },
  company: { fr: 'Entreprise', en: 'Company' },
  language: { fr: 'Langue', en: 'Language' },
  languageCompanyDefault: { fr: "Celle de l'entreprise", en: "The company's" },
  languageFr: { fr: 'Français', en: 'Français' },
  languageEn: { fr: 'English', en: 'English' },
  requestId: { fr: 'No de requête', en: 'Request id' },
  serverUnreachable: {
    fr: 'Le serveur est injoignable.',
    en: 'The server cannot be reached.'
  },
  updateRequiredTitle: {
    fr: "Mise à jour de l'application requise",
    en: 'Application update required'
  },
  updateRequiredBody: {
    fr: "Le serveur utilise une version plus récente de l'API ({server}) que celle que cette application connaît ({client}). Installez la dernière version de l'application.",
    en: 'The server uses a newer API version ({server}) than this application knows ({client}). Install the latest version of the application.'
  },
  welcome: { fr: 'Bienvenue, {name}', en: 'Welcome, {name}' },
  welcomeHint: {
    fr: 'Choisissez un élément dans le menu.',
    en: 'Choose an item from the menu.'
  },
  notInMeta: {
    fr: "Cet élément n'existe pas ou vous n'y avez pas accès.",
    en: 'This item does not exist or you do not have access to it.'
  },
  screenPending: {
    fr: 'Cet écran arrive bientôt.',
    en: 'This screen is coming soon.'
  }
} as const satisfies Record<string, Record<Language, string>>

export type TextKey = keyof typeof TEXTS

export function text(
  language: Language,
  key: TextKey,
  params?: Record<string, string | number>
): string {
  let s: string = TEXTS[key][language]
  for (const [name, value] of Object.entries(params ?? {})) {
    s = s.replaceAll(`{${name}}`, String(value))
  }
  return s
}

/** Before sign-in: the first of fr / en among the OS's languages, else French (as the server). */
export function systemLanguage(): Language {
  for (const tag of navigator.languages) {
    const lang = tag.slice(0, 2).toLowerCase()
    if (lang === 'fr' || lang === 'en') return lang
  }
  return 'fr'
}

/** The Intl locale for a language (the server writes its own texts in the same ones). */
export function locale(language: Language): string {
  return language === 'en' ? 'en-CA' : 'fr-CA'
}
