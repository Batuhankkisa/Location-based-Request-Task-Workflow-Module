export function normalizeSearchText(value?: string | null) {
  return (value ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchesSearchTerm(searchTerm: string, values: Array<string | number | boolean | null | undefined>) {
  const normalizedSearchTerm = normalizeSearchText(searchTerm);

  if (!normalizedSearchTerm) {
    return true;
  }

  return values.some((value) => normalizeSearchText(String(value ?? '')).includes(normalizedSearchTerm));
}
