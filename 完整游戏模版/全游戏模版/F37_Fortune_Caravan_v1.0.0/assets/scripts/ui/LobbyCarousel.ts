export type SlideDirection = -1 | 1;
export interface LobbyMove { readonly index:number; readonly direction:SlideDirection; readonly token:number }

/** One live transition and one latest-intent slot: quick taps stay bounded. */
export class LobbyCarousel {
  private current=0;
  private sequence=0;
  private active?:LobbyMove;
  private pending?:{index:number;direction?:SlideDirection};
  constructor(readonly count:number){
    if(!Number.isInteger(count)||count<1)throw new RangeError('A carousel needs at least one destination.');
  }
  get index():number{return this.current;}
  get moving():boolean{return !!this.active;}
  get target():number{return this.pending?.index??this.current;}
  private normalize(index:number):number{
    if(!Number.isFinite(index))throw new RangeError('Destination must be finite.');
    return ((Math.trunc(index)%this.count)+this.count)%this.count;
  }
  step(direction:SlideDirection):number{return this.normalize(this.target+direction);}
  request(index:number,direction?:SlideDirection):LobbyMove|undefined{
    index=this.normalize(index);
    if(this.active){this.pending=index===this.current?undefined:{index,direction};return;}
    if(index===this.current)return;
    const forward=(index-this.current+this.count)%this.count;
    const move:LobbyMove={index,direction:direction??(forward<=this.count-forward?1:-1),token:++this.sequence};
    this.current=index;this.active=move;return move;
  }
  complete(move:LobbyMove):LobbyMove|undefined{
    if(this.active?.token!==move.token)return;
    this.active=undefined;const next=this.pending;this.pending=undefined;
    return next?this.request(next.index,next.direction):undefined;
  }
  /** A page rebuild invalidates old async completions without losing selection. */
  reset():void{this.active=undefined;this.pending=undefined;this.sequence++;}
}
