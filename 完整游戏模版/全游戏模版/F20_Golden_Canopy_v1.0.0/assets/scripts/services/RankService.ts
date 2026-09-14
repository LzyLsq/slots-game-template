import { SaveService, type PlayerRecord } from './SaveService';
import type { ProductionApiClient } from './ProductionApiClient';

export interface RankEntry { rank: number; nickname: string; winnings: number; avatar: number; current: boolean; }
export class RankService {
  private readonly snapshots = new Map<'daily' | 'weekly' | 'all-time', RankEntry[]>();
  public constructor(private readonly api?: ProductionApiClient,private readonly save?:SaveService) {}
  public hasSnapshot(tab: 'daily' | 'weekly' | 'all-time'): boolean { return this.snapshots.has(tab); }
  public list(tab: 'daily' | 'weekly' | 'all-time', current?: PlayerRecord): RankEntry[] {
    if (this.api) return this.snapshots.get(tab) ?? [];
    if(tab!=='all-time')return [];
    const state=this.save?.read();
    if(!state)return current?[{rank:1,nickname:current.nickname,winnings:current.totalWin,avatar:current.avatar,current:true}]:[];
    const players=Object.values(state.players)
      // Old preview builds created a fresh guest after every refresh. Keep only
      // the active guest so those abandoned zero-score profiles cannot skew rank.
      .filter(player=>!player.isGuest||player.id===state.currentUserId)
      .sort((a,b)=>b.totalWin-a.totalWin||a.nickname.localeCompare(b.nickname)||a.id.localeCompare(b.id));
    return players.map((player,index)=>({rank:index+1,nickname:player.nickname,winnings:player.totalWin,avatar:player.avatar,current:player.id===state.currentUserId}));
  }

  public async refresh(tab: 'daily' | 'weekly' | 'all-time'): Promise<RankEntry[]> {
    if (!this.api) return this.list(tab);
    const response = await this.api.leaderboard(tab); const entries = response.entries.filter((entry) => Number.isSafeInteger(entry.rank) && entry.rank > 0 && Number.isSafeInteger(entry.winnings) && entry.winnings >= 0 && Number.isSafeInteger(entry.avatar) && entry.avatar >= 0 && entry.avatar <= 15 && typeof entry.nickname === 'string' && entry.nickname.length > 0 && entry.nickname.length <= 18).slice(0, 8);
    this.snapshots.set(tab, entries); return entries;
  }
}

export interface HallRankEntry extends RankEntry { virtual: boolean; }
/** Mixed display standings; never writes character scores into saved player records. */
export function hallStandings(players: readonly RankEntry[]): HallRankEntry[] {
  const friends = [
    {nickname:'Acorn Archie',winnings:128000,avatar:0},
    {nickname:'Ruby Rosie',winnings:96500,avatar:1},
    {nickname:'Pearl Pippin',winnings:74200,avatar:2},
    {nickname:'Crown Robin',winnings:53600,avatar:3},
    {nickname:'Lucky Clover',winnings:31800,avatar:8},
  ];
  return [...players.map(p=>({...p,virtual:false})),...friends.map(p=>({...p,rank:0,current:false,virtual:true}))]
    .sort((a,b)=>b.winnings-a.winnings||Number(a.virtual)-Number(b.virtual)||a.rank-b.rank||a.nickname.localeCompare(b.nickname))
    .map((p,i)=>({...p,rank:i+1}));
}
