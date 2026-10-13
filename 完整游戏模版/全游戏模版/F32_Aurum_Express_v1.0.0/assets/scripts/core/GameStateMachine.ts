export type GameState =
  | 'idle'
  | 'reserving-bet'
  | 'result-ready'
  | 'spinning'
  | 'stopping'
  | 'evaluating'
  | 'presenting-win'
  | 'feature'
  | 'settled';

const transitions: Readonly<Record<GameState, readonly GameState[]>> = {
  idle: ['reserving-bet'],
  'reserving-bet': ['result-ready', 'idle'],
  'result-ready': ['spinning'],
  spinning: ['stopping'],
  stopping: ['evaluating'],
  evaluating: ['presenting-win', 'feature', 'settled'],
  'presenting-win': ['feature', 'settled'],
  feature: ['settled'],
  settled: ['idle'],
};

export class GameStateMachine {
  private current: GameState = 'idle';

  public get state(): GameState {
    return this.current;
  }

  public can(next: GameState): boolean {
    return transitions[this.current].includes(next);
  }

  public move(next: GameState): void {
    if (!this.can(next)) throw new Error(`Illegal state transition ${this.current} -> ${next}`);
    this.current = next;
  }

  public reset(): void {
    this.current = 'idle';
  }
}
