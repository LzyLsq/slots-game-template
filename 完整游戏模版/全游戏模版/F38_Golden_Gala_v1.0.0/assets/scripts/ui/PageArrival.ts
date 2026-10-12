/** A bounded scene-entry barrier; stale tween callbacks cannot unlock a new page. */
export interface ArrivalSurface {
  readonly isValid:boolean;
  active:boolean;
  pauseSystemEvents(recursive:boolean):void;
  resumeSystemEvents(recursive:boolean):void;
  destroy():void;
}
export interface ArrivalTicket {readonly ready:Promise<void>;finish():void}
export class PageArrival {
  private pending?:{ticket:ArrivalTicket;cancel:()=>void};
  get active():boolean{return !!this.pending;}
  get ready():Promise<void>{return this.pending?.ticket.ready??Promise.resolve();}
  begin(incoming:ArrivalSurface,outgoing?:ArrivalSurface,shield?:ArrivalSurface):ArrivalTicket {
    this.cancel();
    if(incoming.isValid)incoming.pauseSystemEvents(true);
    if(outgoing?.isValid&&outgoing!==incoming)outgoing.pauseSystemEvents(true);
    let resolve!:()=>void;
    const ready=new Promise<void>(done=>{resolve=done;});
    let settled=false;
    const settle=(resume:boolean):void=>{
      if(settled)return;settled=true;
      if(shield?.isValid){shield.active=false;shield.destroy();}
      if(outgoing?.isValid&&outgoing!==incoming)outgoing.destroy();
      if(resume&&incoming.isValid)incoming.resumeSystemEvents(true);
      if(this.pending?.ticket===ticket)this.pending=undefined;
      resolve();
    };
    const ticket:ArrivalTicket={ready,finish:()=>settle(true)};
    this.pending={ticket,cancel:()=>settle(false)};
    return ticket;
  }
  /** Settle waits and remove the old scene, but never reactivate a retiring tree. */
  cancel():void{this.pending?.cancel();}
}
