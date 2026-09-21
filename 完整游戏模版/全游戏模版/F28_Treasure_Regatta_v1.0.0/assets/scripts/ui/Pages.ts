/** Leaves room for proportional-font wrapping without shrinking rule text. */
export function readablePages(body: string, columns = 30, lines = 8): string[] {
  if (!Number.isInteger(columns) || !Number.isInteger(lines) || columns < 1 || lines < 1) throw new Error('Invalid page budget');
  const wrapped: string[] = [];
  for (const paragraph of body.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + word.length + 1 > columns) { wrapped.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    wrapped.push(line);
  }
  const pages: string[] = [];
  for (let start = 0; start < wrapped.length; start += lines) pages.push(wrapped.slice(start, start + lines).join('\n').trim());
  return pages.filter(Boolean).length ? pages.filter(Boolean) : [''];
}
