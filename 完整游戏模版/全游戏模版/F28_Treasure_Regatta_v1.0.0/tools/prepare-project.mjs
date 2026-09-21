import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const scriptUUID = 'ab271100-5734-417c-9239-e6c4ba271001';
const sceneUUID = 'ab271200-5734-417c-9239-e6c4ba271001';
const hex = scriptUUID.replaceAll('-', '');
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let compressed = hex.slice(0,5);
for (let i=5;i<32;i+=3) { const v=parseInt(hex.slice(i,i+3),16); compressed+=alphabet[v>>6]+alphabet[v&63]; }
const scene = [
 {__type__:'cc.SceneAsset',_name:'TreasureRegatta',_objFlags:0,_native:'',scene:{__id__:1}},
 {__type__:'cc.Scene',_name:'TreasureRegatta',_objFlags:0,_parent:null,_children:[{__id__:2}],_active:true,_components:[],_prefab:null,autoReleaseAssets:false,_id:sceneUUID},
 {__type__:'cc.Node',_name:'RegattaRoot',_objFlags:0,_parent:{__id__:1},_children:[],_active:true,_components:[{__id__:3}],_prefab:null,_lpos:{__type__:'cc.Vec3',x:0,y:0,z:0},_lrot:{__type__:'cc.Quat',x:0,y:0,z:0,w:1},_lscale:{__type__:'cc.Vec3',x:1,y:1,z:1},_layer:33554432,_id:'regatta-root'},
 {__type__:compressed,_name:'',_objFlags:0,node:{__id__:2},_enabled:true,__prefab:null,_id:'regatta-app'}
];
const files = {
 'assets/scenes/TreasureRegatta.scene':scene,
 'assets/scenes/TreasureRegatta.scene.meta':{ver:'1.1.50',importer:'scene',imported:true,uuid:sceneUUID,files:['.json'],subMetas:{},userData:{}},
 'assets/scripts/RegattaApp.ts.meta':{ver:'4.0.24',importer:'typescript',imported:true,uuid:scriptUUID,files:[],subMetas:{},userData:{}},
 'tools/web-mobile-release-build.json':{platform:'web-mobile',debug:false,buildPath:'project://build',outputName:'web-mobile',name:'f28-treasure-regatta',sourceMaps:true,md5Cache:false,packAutoAtlas:true,useSplashScreen:true,startScene:sceneUUID,scenes:[{url:'db://assets/scenes/TreasureRegatta.scene',uuid:sceneUUID}],packages:{'web-mobile':{orientation:'portrait',useWebGPU:false,embedWebDebugger:false}},overwriteProjectSettings:{includeModules:{'gfx-webgl2':'on'}}},
 'tsconfig.runtime.json':{compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',strict:true,noUncheckedIndexedAccess:true,experimentalDecorators:true,skipLibCheck:true,lib:['ES2022','DOM'],types:[],paths:{cc:['/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/Resources/resources/3d/engine/bin/.declarations/cc.d.ts']}},include:['assets/scripts/**/*.ts']}
};
for(const [path,value] of Object.entries(files)) {
 const content=JSON.stringify(value,null,2)+'\n';
 execFileSync('apply_patch',[],{cwd:root,input:`*** Begin Patch\n*** Add File: ${path}\n${content.split('\n').map(l=>'+'+l).join('\n')}\n*** End Patch\n`});
}
console.log('Prepared independent scene, script binding and build configuration.');
