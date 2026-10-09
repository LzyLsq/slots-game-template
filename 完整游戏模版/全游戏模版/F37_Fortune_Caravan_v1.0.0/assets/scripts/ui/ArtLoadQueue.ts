/** Keep order and one decode per bitmap. Use Array.from, not Set spread:
 * Creator's ES5 pipeline may lower [...set] as Array.concat(set). */
export function uniqueArtNames(names:readonly string[]):string[]{
 return Array.from(new Set(names));
}
