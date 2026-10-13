/** Display and crawl order: Asia-Pacific first, since the service starts with the Korean community. */
export const REGIONS = ["AP", "US", "EU"] as const;
export type Region = (typeof REGIONS)[number];

export const MODES = ["arena", "undergroundarena", "standard", "wild", "battlegrounds"] as const;
export type Mode = (typeof MODES)[number];

/** Blizzard serves leaderboards 25 rows per page and ignores any page size parameter. */
export const PAGE_SIZE = 25;

export interface Board {
  region: Region;
  mode: Mode;
}

export const BOARDS: readonly Board[] = REGIONS.flatMap((region) =>
  MODES.map((mode) => ({ region, mode })),
);

/** Sort comparator: region order (AP, US, EU), then mode order. */
export function compareBoards(a: Board, b: Board): number {
  return REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) || MODES.indexOf(a.mode) - MODES.indexOf(b.mode);
}

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}

export function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

export function regionSlug(region: Region): string {
  return region.toLowerCase();
}

export function regionFromSlug(slug: string): Region | undefined {
  const upper = slug.toUpperCase();
  return isRegion(upper) ? upper : undefined;
}

export type BoardId = `${Region}:${Mode}`;

export function boardId({ region, mode }: Board): BoardId {
  return `${region}:${mode}`;
}

export function parseBoardId(id: string): Board | undefined {
  const [region, mode] = id.split(":");
  if (!region || !mode || !isRegion(region) || !isMode(mode)) return undefined;
  return { region, mode };
}

export function pageOfRank(rank: number): number {
  return Math.ceil(rank / PAGE_SIZE);
}
