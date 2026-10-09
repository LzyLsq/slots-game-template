export type ScreenPolicy = 'show-all' | 'fixed-height' | 'fixed-width';
export interface ScreenLayout {policy:ScreenPolicy;rotate:boolean}
/** A fine-pointer desktop can preview the portrait game without an impossible rotate prompt. */
export function screenLayout(width:number,height:number,desktopPointer:boolean):ScreenLayout{
  const landscape=width>height;
  if(landscape&&desktopPointer)return {policy:'show-all',rotate:false};
  return {policy:landscape||height/Math.max(1,width)<1920/1080?'fixed-height':'fixed-width',rotate:landscape};
}
