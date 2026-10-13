import {guardianPose,limbMesh} from './guardian-pose.mjs';
/** Pixel-aligned local rig. Original feet/contact shadows, body and entire room
 * stay in the single scene raster. Only an exact-alpha extracted limb animates
 * over a masked, AI-repaired occlusion plate. No background inverse warp. */
export class CabinetMotion {
 constructor(base,limb,canvas,geometry,theme,isEnabled){
  Object.assign(this,{canvas,geometry,theme,isEnabled,running:true,elapsed:0,last:0,activity:'idle',fixedTime:null});
  this.refresh=()=>{};this.rig=geometry?.guardian;
  try{
  const rig=this.rig;
  if(!rig?.patch||!base?.complete||!limb?.complete)throw Error('Incomplete guardian rig');
  const [x,y,w,h]=rig.patch;Object.assign(canvas.style,{inset:'auto',left:100*x/geometry.width+'%',top:100*y/geometry.height+'%',width:100*w/geometry.width+'%',height:100*h/geometry.height+'%'});
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,powerPreference:'low-power'});this.gl=gl;
  if(!gl){canvas.style.opacity='0';return;}
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   this.program=gl.createProgram();const shaders=[compile(gl.VERTEX_SHADER,'attribute vec2 position;attribute vec2 texcoord;varying vec2 uv;void main(){uv=texcoord;gl_Position=vec4(position,0.,1.);}'),compile(gl.FRAGMENT_SHADER,'precision highp float;varying vec2 uv;uniform sampler2D art;void main(){gl_FragColor=texture2D(art,uv);}')];
   shaders.forEach(s=>gl.attachShader(this.program,s));gl.linkProgram(this.program);shaders.forEach(s=>gl.deleteShader(s));if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Guardian rig unavailable');gl.useProgram(this.program);
   this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);const p=gl.getAttribLocation(this.program,'position'),u=gl.getAttribLocation(this.program,'texcoord');gl.enableVertexAttribArray(p);gl.enableVertexAttribArray(u);gl.vertexAttribPointer(p,2,gl.FLOAT,false,16,0);gl.vertexAttribPointer(u,2,gl.FLOAT,false,16,8);
   gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
   this.textures=[base,limb].map(image=>{const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);for(const [p,v]of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,p,v);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return texture;});
   this.quad=new Float32Array([-1,-1,0,1,1,-1,1,1,-1,1,0,0,-1,1,0,0,1,-1,1,1,1,1,1,0]);
   this.draw=()=>{
    if(!this.running)return;
    const active=this.isEnabled();canvas.style.opacity=active?'1':'0';if(!active)return;
    gl.disable(gl.BLEND);gl.bindTexture(gl.TEXTURE_2D,this.textures[0]);gl.bufferData(gl.ARRAY_BUFFER,this.quad,gl.STREAM_DRAW);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.bindTexture(gl.TEXTURE_2D,this.textures[1]);const time=this.fixedTime??this.elapsed/1000,pose=guardianPose(theme,time,this.activity);if(this.previousActivity&&this.activityChanged!==undefined){const u=Math.max(0,Math.min(1,(this.elapsed/1000-this.activityChanged)/.28)),blend=u*u*(3-2*u),before=guardianPose(theme,time,this.previousActivity);for(const k of ['shoulder','wrist','reach'])pose[k]=before[k]*(1-blend)+pose[k]*blend;}const data=limbMesh(rig,pose);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STREAM_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/4);
   };
   const tick=now=>{this.frame=null;if(!this.running||document.hidden)return;const active=this.isEnabled();if(active&&this.last&&this.fixedTime===null)this.elapsed+=Math.min(now-this.last,50);this.last=now;this.draw();if(active&&this.fixedTime===null)this.frame=requestAnimationFrame(tick);};
   this.refresh=()=>{this.last=0;this.draw();if(this.running&&!document.hidden&&this.isEnabled()&&this.fixedTime===null&&!this.frame)this.frame=requestAnimationFrame(tick);};
   this.observer=new ResizeObserver(()=>{const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));gl.viewport(0,0,canvas.width,canvas.height);this.refresh();});this.observer.observe(canvas);
   this.visibility=()=>{cancelAnimationFrame(this.frame);this.frame=null;this.last=0;if(!document.hidden)this.refresh();};document.addEventListener('visibilitychange',this.visibility);
   this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.preference=()=>this.refresh();this.reduced.addEventListener('change',this.preference);
   this.loss=e=>{e.preventDefault();canvas.style.opacity='0';this.destroy();};canvas.addEventListener('webglcontextlost',this.loss);this.refresh();
  }catch(error){console.warn(error);canvas.style.opacity='0';this.destroy();}
 }
 setActivity(activity){if(activity===this.activity)return;this.previousActivity=this.activity;this.activityChanged=this.elapsed/1000;this.activity=activity;this.refresh();}
 sample(seconds=null){if(seconds!==null&&!Number.isFinite(seconds))return;this.fixedTime=seconds;cancelAnimationFrame(this.frame);this.frame=null;this.refresh();}
 snapshot(){return {theme:this.theme,activity:this.activity,time:this.fixedTime??this.elapsed/1000,enabled:this.isEnabled(),patch:this.rig?.patch,pivot:this.rig?.pivot};}
 destroy(){if(!this.running)return;this.running=false;document.removeEventListener('visibilitychange',this.visibility);this.reduced?.removeEventListener('change',this.preference);this.canvas.removeEventListener('webglcontextlost',this.loss);cancelAnimationFrame(this.frame);this.observer?.disconnect();if(this.gl){this.textures?.forEach(t=>this.gl.deleteTexture(t));this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();}this.canvas.style.opacity='0';}
}
