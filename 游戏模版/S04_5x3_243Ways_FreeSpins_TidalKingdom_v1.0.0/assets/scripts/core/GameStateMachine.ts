export enum GameState { Boot='Boot', Loading='Loading', Lobby='Lobby', BaseIdle='BaseIdle', SpinRequested='SpinRequested', ReelsAccelerating='ReelsAccelerating', ReelsSpinning='ReelsSpinning', ReelsStopping='ReelsStopping', Evaluate='Evaluate', LineWinPresentation='LineWinPresentation', FeatureCheck='FeatureCheck', FreeSpins='FreeSpins', HoldAndSpin='HoldAndSpin', TotalWinPresentation='TotalWinPresentation' }
const legal: Record<GameState, GameState[]> = {
  [GameState.Boot]:[GameState.Loading], [GameState.Loading]:[GameState.Lobby], [GameState.Lobby]:[GameState.BaseIdle],
  [GameState.BaseIdle]:[GameState.SpinRequested], [GameState.SpinRequested]:[GameState.ReelsAccelerating], [GameState.ReelsAccelerating]:[GameState.ReelsSpinning],
  [GameState.ReelsSpinning]:[GameState.ReelsStopping], [GameState.ReelsStopping]:[GameState.Evaluate], [GameState.Evaluate]:[GameState.LineWinPresentation],
  [GameState.LineWinPresentation]:[GameState.FeatureCheck], [GameState.FeatureCheck]:[GameState.FreeSpins,GameState.HoldAndSpin,GameState.TotalWinPresentation],
  [GameState.FreeSpins]:[GameState.TotalWinPresentation,GameState.FreeSpins], [GameState.HoldAndSpin]:[GameState.TotalWinPresentation,GameState.HoldAndSpin],
  [GameState.TotalWinPresentation]:[GameState.BaseIdle]
};
export class GameStateMachine {
  state = GameState.Boot;
  transition(next: GameState): void { if (!legal[this.state].includes(next)) throw new Error(`Illegal state ${this.state} -> ${next}`); this.state = next; }
}
