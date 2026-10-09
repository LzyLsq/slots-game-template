/** Cocos's static vertex buffers are shared with labels and other sprites.
 * Dense skinned meshes have more indices per vertex than ordinary quads.
 * Always append through the accessor, which grows the shared index buffer;
 * writing mesh.iData directly can overflow it and prevent the frame reset. */
export interface GuardianIndexChunk {vertexOffset:number;bufferId:number;}
export interface GuardianIndexAccessor {appendIndices(bufferId:number,indices:Uint16Array):void;}
export function guardianGridIndices(nx:number,ny:number):Uint16Array{
 const data=new Uint16Array(nx*ny*6);let k=0;
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;
  data[k++]=a;data[k++]=c;data[k++]=b;data[k++]=b;data[k++]=c;data[k++]=d;
 }
 return data;
}
export function appendGuardianIndices(accessor:GuardianIndexAccessor,chunk:GuardianIndexChunk,local:Uint16Array,mapped:Uint16Array):void{
 for(let i=0;i<local.length;i++)mapped[i]=chunk.vertexOffset+local[i];
 accessor.appendIndices(chunk.bufferId,mapped);
}
