import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
const spins=100000;const report=GAME_CONFIGS.map((cfg,i)=>{const g=new ResultGenerator(),r=new SeededRNG(0x71cafe+i),bet=200,levels=[1,2,5,10,20,50,100],counts=levels.map(()=>0);let paid=0,hits=0;for(let n=0;n<spins;n++){const a=g.generate(cfg,bet,r).totalWin;paid+=a;hits+=Number(a>0);levels.forEach((v,j)=>{if(a/bet>=v)counts[j]++});}return{game:cfg.name,spins,rtp:paid/(spins*bet),hitRate:hits/spins,multiplierRates:Object.fromEntries(levels.map((v,j)=>[v,counts[j]/spins]))};});console.log(JSON.stringify(report,null,2));
