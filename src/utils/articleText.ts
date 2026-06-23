/** Strip HTML and count words (Vietnamese + Latin). */
export function countWordsFromHtml(html: string): number {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function calcReadingTimeMinutes(html: string): number {
  const words = countWordsFromHtml(html);
  return Math.max(1, Math.ceil(words / 200));
}

/** Vietnamese-friendly slug: remove diacritics, lowercase, hyphenate. */
export function slugifyVi(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
