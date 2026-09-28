export type Route = 'boot' | 'age-gate' | 'login' | 'register' | 'forgot' | 'privacy' | 'terms' | 'support' | 'home' | 'store' | 'rewards' | 'rank' | 'profile' | 'achievements' | 'mail' | 'check-in' | 'wheel' | 'settings' | 'game-loading' | 'game';
export class SceneRouter {
  private currentRoute: Route = 'boot';
  private readonly history: Route[] = [];
  public constructor(private readonly onRoute: (route: Route) => void) {}
  public go(route: Route): void { if (route === this.currentRoute) return; this.history.push(this.currentRoute); this.currentRoute = route; this.onRoute(route); }
  public replace(route: Route): void { if (route === this.currentRoute) return; this.currentRoute = route; this.onRoute(route); }
  public back(fallback: Route = 'home'): void { this.currentRoute = this.history.pop() ?? fallback; this.onRoute(this.currentRoute); }
  public reset(route: Route): void { this.history.length = 0; this.currentRoute = route; this.onRoute(route); }
  public get route(): Route { return this.currentRoute; }
}
