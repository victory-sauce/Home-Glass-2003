export interface PackingAdapterItem {
  id: string;
  width: number;
  height: number;
  allowRotation: boolean;
}

export interface PackingAdapterSource {
  id: string;
  width: number;
  height: number;
  rack?: string | null;
  rackOrder?: number | null;
}

export interface PackingPlacement {
  itemId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface PackingResult {
  placements: PackingPlacement[];
  unplacedItemIds: string[];
  wasteArea: number;
  usefulLeftoverArea: number;
}

export interface PackingEngine {
  name: string;
  pack(source: PackingAdapterSource, items: PackingAdapterItem[]): PackingResult;
}

export interface SourcePackCandidate {
  source: PackingAdapterSource;
  result: PackingResult;
}

const COMPARABLE_WASTE_DELTA_RATIO = 0.12;
const MIN_COMPARABLE_WASTE_DELTA = 20_000;

function sourceArea(source: PackingAdapterSource) {
  return source.width * source.height;
}

function isWasteComparable(a: number, b: number) {
  const delta = Math.abs(a - b);
  const baseline = Math.max(MIN_COMPARABLE_WASTE_DELTA, Math.min(a, b) * COMPARABLE_WASTE_DELTA_RATIO);
  return delta <= baseline;
}

function isLeftoverRack(source: PackingAdapterSource) {
  return (source.rack ?? "").trim().toLowerCase() === "leftovers";
}

/**
 * Business scoring only. Keep this separate from whichever packing engine we choose.
 */
export function compareSourcePackCandidates(a: SourcePackCandidate, b: SourcePackCandidate): number {
  const aFulfilled = a.result.unplacedItemIds.length === 0;
  const bFulfilled = b.result.unplacedItemIds.length === 0;
  if (aFulfilled !== bFulfilled) return aFulfilled ? -1 : 1;

  if (a.result.unplacedItemIds.length !== b.result.unplacedItemIds.length) {
    return a.result.unplacedItemIds.length - b.result.unplacedItemIds.length;
  }

  const aArea = sourceArea(a.source);
  const bArea = sourceArea(b.source);
  if (aArea !== bArea) return aArea - bArea;

  if (a.result.wasteArea !== b.result.wasteArea) {
    return a.result.wasteArea - b.result.wasteArea;
  }

  if (a.result.usefulLeftoverArea !== b.result.usefulLeftoverArea) {
    return b.result.usefulLeftoverArea - a.result.usefulLeftoverArea;
  }

  if (isWasteComparable(a.result.wasteArea, b.result.wasteArea)) {
    const aLeftoverRack = isLeftoverRack(a.source);
    const bLeftoverRack = isLeftoverRack(b.source);
    if (aLeftoverRack !== bLeftoverRack) return aLeftoverRack ? -1 : 1;
  }

  return (a.source.rackOrder ?? 0) - (b.source.rackOrder ?? 0);
}

export function pickBestSourceCandidate(candidates: SourcePackCandidate[]) {
  return [...candidates].sort(compareSourcePackCandidates)[0];
}

export function packItemsOnSources(items: PackingAdapterItem[], sources: PackingAdapterSource[], engine: PackingEngine) {
  const candidates = sources.map((source) => ({
    source,
    result: engine.pack(source, items),
  }));

  return {
    engineName: engine.name,
    candidates,
    best: pickBestSourceCandidate(candidates),
  };
}

/**
 * Prototype fallback packer that always generates a guillotine-feasible shelf layout.
 * This gives us a deterministic adapter target for tests while evaluating external libs.
 */
export const shelfGuillotinePrototypeEngine: PackingEngine = {
  name: "shelf-guillotine-prototype",
  pack(source, items) {
    const placements: PackingPlacement[] = [];
    const unplacedItemIds: string[] = [];

    let rowY = 0;
    let rowHeight = 0;
    let rowUsedWidth = 0;

    for (const item of items) {
      const orientations = [
        { width: item.width, height: item.height, rotated: false },
        ...(item.allowRotation && item.width !== item.height
          ? [{ width: item.height, height: item.width, rotated: true }]
          : []),
      ];

      const placeInCurrentRow = orientations.find(
        (o) => rowUsedWidth + o.width <= source.width && rowY + Math.max(rowHeight, o.height) <= source.height
      );

      if (placeInCurrentRow) {
        placements.push({
          itemId: item.id,
          x: rowUsedWidth,
          y: rowY,
          width: placeInCurrentRow.width,
          height: placeInCurrentRow.height,
          rotated: placeInCurrentRow.rotated,
        });
        rowUsedWidth += placeInCurrentRow.width;
        rowHeight = Math.max(rowHeight, placeInCurrentRow.height);
        continue;
      }

      const nextRowY = rowY + rowHeight;
      const placeInNextRow = orientations.find((o) => o.width <= source.width && nextRowY + o.height <= source.height);

      if (placeInNextRow) {
        rowY = nextRowY;
        rowHeight = placeInNextRow.height;
        rowUsedWidth = placeInNextRow.width;
        placements.push({
          itemId: item.id,
          x: 0,
          y: rowY,
          width: placeInNextRow.width,
          height: placeInNextRow.height,
          rotated: placeInNextRow.rotated,
        });
        continue;
      }

      unplacedItemIds.push(item.id);
    }

    const usedArea = placements.reduce((sum, p) => sum + p.width * p.height, 0);
    const area = sourceArea(source);
    const wasteArea = Math.max(0, area - usedArea);

    // Minimal heuristic for useful leftovers; exact mapping can stay in cutPlanner.
    const usefulLeftoverArea = wasteArea >= 20_000 ? wasteArea : 0;

    return { placements, unplacedItemIds, wasteArea, usefulLeftoverArea };
  },
};

/**
 * Runtime loader scaffold for future external integration without hard-coupling yet.
 */
export async function loadGuillotinePackerModule(packageName = "guillotine-packer") {
  const runtimeImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
  return runtimeImport(packageName);
}

export async function loadRectanglePackerModule(packageName = "rectangle-packer") {
  const runtimeImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;
  return runtimeImport(packageName);
}
