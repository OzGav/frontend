/** Lowercase + strip diacritics: "Béla Bartók" → "bela bartok". */
export const normalizeForFilter = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
