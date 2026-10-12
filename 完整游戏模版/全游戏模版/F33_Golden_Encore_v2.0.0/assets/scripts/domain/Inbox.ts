/** Device-local demo inbox. Neither these messages nor their coin attachments imply a server account. */
export const LETTERS = [
  { id: 'welcome', title: 'WELCOME LETTER', body: 'A welcome gift for your first visit to the Lantern House.', coins: 600 },
  { id: 'house-news', title: 'HOUSE NOTICE', body: 'Four treasure rooms are open. Your cabinet rules are in the House Journal.', coins: 0 },
  { id: 'voyage', title: 'VOYAGE GIFT', body: 'A little extra virtual gold for your next voyage.', coins: 900 },
] as const;
export type LetterId = typeof LETTERS[number]['id'];
export type LetterState = { read: boolean; claimed: boolean; deleted: boolean };
export type Inbox = Partial<Record<LetterId, LetterState>>;
export const letterState = (inbox: Inbox, id: LetterId): LetterState => inbox[id] || { read: false, claimed: false, deleted: false };
export function readLetter(inbox: Inbox, id: LetterId): Inbox {
  if (!LETTERS.some(letter => letter.id === id)) return inbox;
  return { ...inbox, [id]: { ...letterState(inbox, id), read: true } };
}
export function claimLetter(inbox: Inbox, id: LetterId): { inbox: Inbox; coins: number } {
  const letter = LETTERS.find(item => item.id === id);
  const state = letterState(inbox, id);
  if (!letter || !letter.coins || state.claimed || state.deleted) return { inbox, coins: 0 };
  return { inbox: { ...inbox, [id]: { ...state, read: true, claimed: true } }, coins: letter.coins };
}
export function clearRead(inbox: Inbox): Inbox {
  const next = { ...inbox };
  for (const letter of LETTERS) {
    const state = letterState(inbox, letter.id);
    if (state.read && (letter.coins === 0 || state.claimed)) next[letter.id] = { ...state, deleted: true };
  }
  return next;
}
export function unreadCount(inbox: Inbox): number {
  return LETTERS.filter(letter => { const state = letterState(inbox, letter.id); return !state.read && !state.deleted; }).length;
}
