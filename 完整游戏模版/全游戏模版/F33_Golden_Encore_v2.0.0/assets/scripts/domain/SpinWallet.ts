/** Local demo balance only. A real-money product must settle on an authoritative server. */
export type PendingSpinPayout = { spin: number; award: number; label: string };
export function reserveSpin(balance: number, stake: number, spin: number, award: number, label: string): { balance: number; pending: PendingSpinPayout } {
  if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(stake) || stake <= 0 || balance < stake ||
      !Number.isSafeInteger(award) || award < 0 || !Number.isSafeInteger(spin) || spin <= 0)
    throw new Error('Invalid local demo spin reservation');
  return { balance: balance - stake, pending: { spin, award, label } };
}
export function settleSpin(balance: number, pending?: PendingSpinPayout): { balance: number; award: number } {
  if (!pending) return { balance, award: 0 };
  if (!Number.isSafeInteger(pending.award) || pending.award < 0 || !Number.isSafeInteger(balance) || balance + pending.award > Number.MAX_SAFE_INTEGER)
    throw new Error('Invalid local demo payout');
  return { balance: balance + pending.award, award: pending.award };
}
