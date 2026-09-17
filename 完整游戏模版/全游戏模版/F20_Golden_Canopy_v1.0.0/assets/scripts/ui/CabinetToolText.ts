import {language,tr} from './Language';
/** Fixed two-line audio captions remain readable on narrow mobile screens. */
export function cabinetToolText(value:string):string{
 if(value!=='SOUND ON'&&value!=='SOUND OFF')return tr(value);
 const enabled=value==='SOUND ON',index=['en','zh-CN','zh-TW','ja','ko'].indexOf(language());
 return (enabled?['SOUND\nON','声音\n开启','聲音\n開啟','音声\nオン','소리\n켜짐']:['SOUND\nOFF','声音\n关闭','聲音\n關閉','音声\nオフ','소리\n꺼짐'])[index]??(enabled?'SOUND\nON':'SOUND\nOFF');
}
