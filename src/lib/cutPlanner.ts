import type { GlassPiece } from "./supabase";

export interface CutPlanOrderItem {
  id: string;
  width: number;
  height: number;
  quantity: number;
  thickness: number;
  glass_type: string;
  allow_rotation: boolean;
  notes?: string | null;
}

export interface ExpandedCutItem {
  id: string;
  orderItemId: string;
  width: number;
  height: number;
  area: number;
  glass_type: string;
  thickness: number;
  allow_rotation: boolean;
  label: string;
}

export interface PlacedCut {
  orderItemId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  glass_type: string;
  thickness: number;
}

export interface CutPlanSource {
  sourcePiece: GlassPiece;
  placedCuts: PlacedCut[];
  usedArea: number;
  wasteArea: number;
  layoutWidth: number;
  layoutHeight: number;
}

export interface CutPlan {
  id: string;
  fulfilled: boolean;
  sources: CutPlanSource[];
  totalWaste: number;
  usedSourceCount: number;
  unplacedItems: ExpandedCutItem[];
  score: number;
}

interface MaterialGroup {
  key: string;
  glass_type: string;
  thickness: number;
  items: ExpandedCutItem[];
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

function expandItems(orderItems: CutPlanOrderItem[]) {
  const expanded: ExpandedCutItem[] = [];

  for (const item of orderItems) {
    const width = toNumber(item.width);
    const height = toNumber(item.height);
    const thickness = toNumber(item.thickness);
    const quantity = Math.max(1, Math.floor(toNumber(item.quantity)));

    if (!width || !height || !thickness || !item.glass_type) continue;

    for (let i = 0; i < quantity; i += 1) {
      expanded.push({
        id: `${item.id}-${i + 1}`,
        orderItemId: item.id,
        width,
        height,
        area: width * height,
        thickness,
        glass_type: item.glass_type,
        allow_rotation: item.allow_rotation,
        label: `${width}×${height}${quantity > 1 ? ` #${i + 1}` : ""}`,
      });
    }
  }

  return expanded;
}

function groupByMaterial(items: ExpandedCutItem[]): MaterialGroup[] {
  const map = new Map<string, MaterialGroup>();

  for (const item of items) {
    const key = `${normalize(item.glass_type)}::${item.thickness}`;
    const existing = map.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    map.set(key, {
      key,
      glass_type: item.glass_type,
      thickness: item.thickness,
      items: [item],
    });
  }

  return [...map.values()];
}

function tryPlaceItem(
  item: ExpandedCutItem,
  sourceWidth: number,
  sourceHeight: number,
  placedCuts: PlacedCut[]
): PlacedCut | null {
  let shelfY = 0;

  while (shelfY < sourceHeight) {
    const shelfCuts = placedCuts.filter((cut) => cut.y === shelfY);
    const shelfUsedWidth = shelfCuts.reduce((sum, cut) => sum + cut.width, 0);
    const shelfHeight = shelfCuts.reduce((max, cut) => Math.max(max, cut.height), 0);

    const remainingWidth = sourceWidth - shelfUsedWidth;

    const fitsNormal = item.width <= remainingWidth && shelfY + item.height <= sourceHeight;
    const fitsRotated =
      item.allow_rotation &&
      item.height <= remainingWidth &&
      shelfY + item.width <= sourceHeight;

    if (fitsNormal || fitsRotated) {
      const shouldRotate = !fitsNormal && fitsRotated;
      const width = shouldRotate ? item.height : item.width;
      const height = shouldRotate ? item.width : item.height;

      return {
        orderItemId: item.orderItemId,
        label: item.label,
        x: shelfUsedWidth,
        y: shelfY,
        width,
        height,
        rotated: shouldRotate,
        glass_type: item.glass_type,
        thickness: item.thickness,
      };
    }

    const nextShelfY = shelfY + Math.max(1, shelfHeight);

    if (nextShelfY === shelfY) break;

    shelfY = nextShelfY;
  }

  return null;
}

function candidatePriority(piece: GlassPiece, requestedArea: number) {
  const sourceArea = toNumber(piece.width) * toNumber(piece.height);
  const waste = Math.max(0, sourceArea - requestedArea);
  const leftoverBoost = normalize(piece.rack) === "leftovers" ? 0 : 1;

  return {
    leftoverBoost,
    waste,
    area: sourceArea,
    rackOrder: piece.rack_order ?? 0,
  };
}

function scorePlan(plan: CutPlan) {
  const fulfillmentScore = plan.fulfilled ? 10000 : -plan.unplacedItems.length * 600;
  const leftoverBonus = plan.sources.reduce((sum, source) => {
    return sum + (normalize(source.sourcePiece.rack) === "leftovers" ? 120 : 0);
  }, 0);
  const sourcePenalty = plan.usedSourceCount * 80;
  const wastePenalty = plan.totalWaste / 100;

  return fulfillmentScore + leftoverBonus - sourcePenalty - wastePenalty;
}

export function generateCutPlans(
  orderItems: CutPlanOrderItem[],
  glassPieces: GlassPiece[]
): CutPlan[] {
  const expandedItems = expandItems(orderItems).sort((a, b) => b.area - a.area);

  if (!expandedItems.length) {
    return [
      {
        id: "plan-empty",
        fulfilled: true,
        sources: [],
        totalWaste: 0,
        usedSourceCount: 0,
        unplacedItems: [],
        score: 0,
      },
    ];
  }

  const groups = groupByMaterial(expandedItems);
  const plans: CutPlan[] = [];

  for (const mode of ["standard", "leftover-heavy"] as const) {
    const planSources: CutPlanSource[] = [];
    const unplaced: ExpandedCutItem[] = [];

    for (const group of groups) {
      const groupArea = group.items.reduce((sum, item) => sum + item.area, 0);

      const candidates = glassPieces
        .filter((piece) => piece.status === "available")
        .filter((piece) => toNumber(piece.thickness) === group.thickness)
        .filter((piece) => normalize(piece.glass_type) === normalize(group.glass_type))
        .sort((a, b) => {
          const pa = candidatePriority(a, groupArea);
          const pb = candidatePriority(b, groupArea);

          if (pa.leftoverBoost !== pb.leftoverBoost) {
            return pa.leftoverBoost - pb.leftoverBoost;
          }

          if (mode === "leftover-heavy" && pa.area !== pb.area) {
            return pa.area - pb.area;
          }

          if (pa.waste !== pb.waste) return pa.waste - pb.waste;
          if (pa.area !== pb.area) return pa.area - pb.area;
          return pa.rackOrder - pb.rackOrder;
        });

      const remaining = [...group.items];

      for (const candidate of candidates) {
        if (!remaining.length) break;

        const pieceWidth = toNumber(candidate.width);
        const pieceHeight = toNumber(candidate.height);
        const placedCuts: PlacedCut[] = [];

        for (const item of [...remaining]) {
          const placement = tryPlaceItem(item, pieceWidth, pieceHeight, placedCuts);

          if (!placement) continue;

          placedCuts.push(placement);
          const index = remaining.findIndex((v) => v.id === item.id);
          if (index >= 0) remaining.splice(index, 1);
        }

        if (!placedCuts.length) continue;

        const usedArea = placedCuts.reduce((sum, cut) => sum + cut.width * cut.height, 0);
        const sourceArea = pieceWidth * pieceHeight;

        planSources.push({
          sourcePiece: candidate,
          placedCuts,
          usedArea,
          wasteArea: Math.max(0, sourceArea - usedArea),
          layoutWidth: pieceWidth,
          layoutHeight: pieceHeight,
        });
      }

      unplaced.push(...remaining);
    }

    const totalWaste = planSources.reduce((sum, source) => sum + source.wasteArea, 0);

    const plan: CutPlan = {
      id: `plan-${mode}`,
      fulfilled: unplaced.length === 0,
      sources: planSources,
      totalWaste,
      usedSourceCount: planSources.length,
      unplacedItems: unplaced,
      score: 0,
    };

    plan.score = scorePlan(plan);
    plans.push(plan);
  }

  return plans.sort((a, b) => b.score - a.score);
}
