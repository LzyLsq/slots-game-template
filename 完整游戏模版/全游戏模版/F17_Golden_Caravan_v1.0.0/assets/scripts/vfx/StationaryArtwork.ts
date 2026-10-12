import { Node } from 'cc';

/** Idle-only policy; press feedback and page transitions remain unaffected. */
export class StationaryArtwork {
  private static tagged = new WeakSet<Node>();

  private static matches(name: string): boolean {
    return /^(?:portraits|avatar\d+|hero[0-3]|cabinet[0-3]|harvest-card-[0-3]|caravan-card-[0-3]|canopy-destinations|carnival-destinations|treasury-hall-soft|harvest-hall-soft|jamboree-plaza|marina|salon|salon-squirrel|golden-hour-animal|jade-treasury-animal|pearl-palace-animal|ruby-revel-animal|golden-hour-tall|jade-treasury-tall|pearl-palace-tall|ruby-revel-tall|captain-scene|cargo-scene|pearl-scene|reef-scene|prize-[\w-]+)(?:$|-live-bg$)/.test(name)
      || /^f27\/(?:loading|scenes|cabinets)\//.test(name);
  }

  public static mark(n: Node, assetName: string): void {
    if (this.matches(assetName)) this.tagged.add(n);
    else this.tagged.delete(n);
  }

  public static contains(n: Node): boolean {
    return this.tagged.has(n) || this.matches(n.name)
      || n.children.some(c => this.contains(c));
  }
}
