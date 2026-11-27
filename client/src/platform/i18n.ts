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
  },
  yes: { fr: 'Oui', en: 'Yes' },
  no: { fr: 'Non', en: 'No' },

  // Lists
  search: { fr: 'Rechercher', en: 'Search' },
  refresh: { fr: 'Actualiser', en: 'Refresh' },
  columns: { fr: 'Colonnes', en: 'Columns' },
  noRows: { fr: 'Aucune ligne', en: 'No rows' },
  rowsRange: { fr: 'Lignes {from} à {to}', en: 'Rows {from} to {to}' },
  rowsPerPage: { fr: 'Par page', en: 'Per page' },
  previousPage: { fr: 'Précédente', en: 'Previous' },
  nextPage: { fr: 'Suivante', en: 'Next' },
  sortHint: {
    fr: 'Cliquer pour trier, Maj+clic pour ajouter un tri',
    en: 'Click to sort, Shift+click to add a sort'
  },

  // Records
  new: { fr: 'Nouveau', en: 'New' },
  creating: { fr: 'Création', en: 'New' },
  save: { fr: 'Enregistrer', en: 'Save' },
  saved: { fr: 'Enregistré', en: 'Saved' },
  cancel: { fr: 'Annuler', en: 'Cancel' },
  delete: { fr: 'Supprimer', en: 'Delete' },
  deleted: { fr: 'Supprimé', en: 'Deleted' },
  back: { fr: 'Retour', en: 'Back' },
  details: { fr: 'Détails', en: 'Details' },
  confirm: { fr: 'Confirmer', en: 'Confirm' },
  deleteTitle: { fr: 'Supprimer cet enregistrement ?', en: 'Delete this record?' },
  deleteBody: {
    fr: '{name} sera supprimé.',
    en: '{name} will be deleted.'
  },
  discardTitle: { fr: 'Abandonner les modifications ?', en: 'Discard your changes?' },
  discardBody: {
    fr: 'Les modifications non enregistrées seront perdues.',
    en: 'Changes that were not saved will be lost.'
  },
  discard: { fr: 'Abandonner', en: 'Discard' },
  keepEditing: { fr: 'Continuer', en: 'Keep editing' },
  conflictTitle: {
    fr: 'Modifié par quelqu’un d’autre',
    en: 'Changed by someone else'
  },
  conflictBody: {
    fr: 'Cet enregistrement a été modifié depuis que vous l’avez ouvert. Rechargez-le, ou gardez vos modifications pour les enregistrer par-dessus la nouvelle version.',
    en: 'This record changed since you opened it. Reload it, or keep your changes to save them over the new version.'
  },
  reload: { fr: 'Recharger', en: 'Reload' },
  keepMine: { fr: 'Garder mes modifications', en: 'Keep my changes' },
  saveFirst: {
    fr: 'Enregistrez ou annulez vos modifications d’abord',
    en: 'Save or cancel your changes first'
  },
  warnings: { fr: 'Avertissements', en: 'Warnings' },
  addLine: { fr: 'Ajouter une ligne', en: 'Add line' },
  removeLine: { fr: 'Retirer la ligne', en: 'Remove line' },
  moreRows: {
    fr: 'Les {n} premières lignes sont affichées.',
    en: 'The first {n} rows are shown.'
  },

  // History
  history: { fr: 'Historique', en: 'History' },
  loadMore: { fr: 'Afficher plus', en: 'Show more' },
  noHistory: { fr: 'Aucun historique', en: 'No history' },
  hiddenValue: { fr: '(masqué)', en: '(hidden)' },
  emptyValue: { fr: '(vide)', en: '(empty)' },
  linesAdded: { fr: '{n} ligne(s) ajoutée(s)', en: '{n} line(s) added' },
  linesChanged: { fr: '{n} ligne(s) modifiée(s)', en: '{n} line(s) changed' },
  linesRemoved: { fr: '{n} ligne(s) retirée(s)', en: '{n} line(s) removed' },

  // Filters
  filters: { fr: 'Filtres', en: 'Filters' },
  addFilter: { fr: 'Ajouter un filtre', en: 'Add filter' },
  clearFilters: { fr: 'Tout effacer', en: 'Clear all' },
  apply: { fr: 'Appliquer', en: 'Apply' },
  field: { fr: 'Champ', en: 'Field' },
  operator: { fr: 'Condition', en: 'Condition' },
  value: { fr: 'Valeur', en: 'Value' },
  valuesHint: { fr: 'Entrée après chaque valeur', en: 'Enter after each value' },
  invalidValue: { fr: 'Valeur invalide', en: 'Invalid value' },
  tooManyFilters: { fr: 'Au plus {max} filtres', en: 'At most {max} filters' },
  'op.equals': { fr: 'est', en: 'is' },
  'op.notEquals': { fr: "n'est pas", en: 'is not' },
  'op.greaterThan': { fr: 'plus grand que', en: 'greater than' },
  'op.greaterThanOrEquals': { fr: 'au moins', en: 'at least' },
  'op.lessThan': { fr: 'plus petit que', en: 'less than' },
  'op.lessThanOrEquals': { fr: 'au plus', en: 'at most' },
  'op.in': { fr: "est l'un de", en: 'is one of' },
  'op.contains': { fr: 'contient', en: 'contains' },
  'op.startsWith': { fr: 'commence par', en: 'starts with' },
  'op.isEmpty': { fr: 'est vide', en: 'is empty' },
  'op.isNotEmpty': { fr: "n'est pas vide", en: 'is not empty' },
  // Dates and times read better as before / after.
  'op.date.greaterThan': { fr: 'après le', en: 'after' },
  'op.date.greaterThanOrEquals': { fr: 'depuis le', en: 'on or after' },
  'op.date.lessThan': { fr: 'avant le', en: 'before' },
  'op.date.lessThanOrEquals': { fr: "jusqu'au", en: 'on or before' }
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
