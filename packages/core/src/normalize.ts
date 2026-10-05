/**
 * Canonical form used for every name comparison: NFKC folds full-width and
 * compatibility characters and composes Hangul jamo; lowercasing makes search
 * case-insensitive.
 */
export function normalizeName(name: string): string {
  return name.normalize("NFKC").toLowerCase().trim();
}
