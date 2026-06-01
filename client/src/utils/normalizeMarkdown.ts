/**
 * Pre-process markdown so common authoring patterns render as expected:
 * - Unicode bullets (•, ·, ●, ‣) → standard list dashes
 * - CRLF → LF
 */
export const normalizeMarkdown = (input: string): string =>
  input
    .replace(/\r\n?/g, '\n')
    .replace(/^([ \t]*)[•·●‣]\s+/gm, '$1- ');
