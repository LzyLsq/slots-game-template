import { _decorator, Component } from 'cc';
import { ReelColumn } from './ReelColumn';
const { ccclass } = _decorator;
@ccclass('ReelController')
export class ReelController extends Component {
  private columns: ReelColumn[] = [];
  public setColumns(columns: ReelColumn[]): void { this.columns = columns; }
  public spin(results: readonly (readonly string[])[], turbo: boolean): Promise<void[]> { return Promise.all(this.columns.map((column, index) => column.spinTo(results[index], index * (turbo ? 0.05 : 0.14), turbo))); }
  public quickStop(): void { this.columns.forEach((column) => column.quickStop()); }
  public highlight(positions: readonly number[], rows: number): void {
    this.columns.forEach((column, columnIndex) => column.highlight(positions.filter((position) => Math.floor(position / rows) === columnIndex).map((position) => position % rows)));
  }
}
