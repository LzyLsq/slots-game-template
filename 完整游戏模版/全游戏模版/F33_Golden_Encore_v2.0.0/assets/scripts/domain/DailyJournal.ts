/** Local-demo daily objectives. The caller owns the clock and persistent wallet. */
export type JournalState = {
  day: string;
  spins: number;
  rooms: [boolean, boolean, boolean, boolean];
  wins: number;
  claimed: [boolean, boolean, boolean];
};
export type JournalGoal = { name: string; detail: string; progress: number; target: number; award: number; ready: boolean; claimed: boolean };

export function freshJournal(day: string): JournalState {
  return { day, spins: 0, rooms: [false, false, false, false], wins: 0, claimed: [false, false, false] };
}
export function journalForDay(raw: unknown, day: string): JournalState {
  if (!raw || typeof raw !== 'object') return freshJournal(day);
  const value = raw as Partial<JournalState>;
  if (value.day !== day || !Array.isArray(value.rooms) || value.rooms.length !== 4 ||
      !Array.isArray(value.claimed) || value.claimed.length !== 3) return freshJournal(day);
  return {
    day,
    spins: Number.isSafeInteger(value.spins) && (value.spins as number) >= 0 ? value.spins as number : 0,
    rooms: value.rooms.map(flag => flag === true) as JournalState['rooms'],
    wins: Number.isSafeInteger(value.wins) && (value.wins as number) >= 0 ? value.wins as number : 0,
    claimed: value.claimed.map(flag => flag === true) as JournalState['claimed'],
  };
}
export function recordJournalSpin(raw: unknown, day: string, room: number, won: boolean): JournalState {
  const state = journalForDay(raw, day);
  const rooms = [...state.rooms] as JournalState['rooms'];
  if (Number.isInteger(room) && room >= 0 && room < rooms.length) rooms[room] = true;
  return { ...state, spins: state.spins + 1, rooms, wins: state.wins + (won ? 1 : 0) };
}
export function journalGoals(raw: unknown, day: string): JournalGoal[] {
  const state = journalForDay(raw, day);
  const goals: Array<[string, string, number, number, number]> = [
    ['OPEN THE HOUSE', 'Play 3 spins in any room', state.spins, 3, 300],
    ['TOUR THE TREASURY', 'Spin in 2 different rooms', state.rooms.filter(Boolean).length, 2, 500],
    ['FIND A FORTUNE', 'Reveal 2 winning spins', state.wins, 2, 700],
  ];
  return goals.map(([name, detail, progress, target, award], i) => ({
    name, detail, progress: Math.min(progress, target), target, award,
    ready: progress >= target && !state.claimed[i], claimed: state.claimed[i],
  }));
}
export function claimJournal(raw: unknown, day: string, index: number): { state: JournalState; award: number } | null {
  const state = journalForDay(raw, day);
  if (!Number.isInteger(index) || index < 0 || index > 2) return null;
  const goal = journalGoals(state, day)[index];
  if (!goal.ready) return null;
  const claimed = [...state.claimed] as JournalState['claimed']; claimed[index] = true;
  return { state: { ...state, claimed }, award: goal.award };
}
