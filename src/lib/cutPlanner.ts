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

export type CutOrientation = "vertical" | "horizontal";

export interface CutStep {
  id: string;
  sequence: number;
  orientation: CutOrientation;
  position: number;
  x: number;
  y: number;
  length: number;
  description: string;
}

export interface LeftoverRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  kind: "leftover" | "waste";
}

export interface CutPlanSource {
  sourcePiece: GlassPiece;
  placedCuts: PlacedCut[];
  usedArea: number;
  leftoverArea: number;
  wasteArea: number;
  layoutWidth: number;
  layoutHeight: number;
  cutSteps: CutStep[];
  leftoverRegions: LeftoverRegion[];
  layoutStrategy: "horizontal_shelf" | "vertical_strip";
  cutCount: number;
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

interface LayoutRow {
  y: number;
  height: number;
  usedWidth: number;
  cuts: PlacedCut[];
}

interface LayoutStrip {
  x: number;
  width: number;
  usedHeight: number;
  cuts: PlacedCut[];
}

interface LayoutResult {
  placedCuts: PlacedCut[];
  unplacedItems: ExpandedCutItem[];
  usedArea: number;
  leftoverArea: number;
  wasteArea: number;
  layoutWidth: number;
  layoutHeight: number;
  cutSteps: CutStep[];
  leftoverRegions: LeftoverRegion[];
  layoutStrategy: "horizontal_shelf" | "vertical_strip";
  cutCount: number;
  usefulLeftoverArea: number;
  complexity: number;
}

const LEFTOVER_THRESHOLDS = {
  minWidth: 100,
  minHeight: 100,
  minArea: 20_000,
} as const;

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

function classifyRegion(width: number, height: number): "leftover" | "waste" {
  const area = width * height;
  return width >= LEFTOVER_THRESHOLDS.minWidth &&
    height >= LEFTOVER_THRESHOLDS.minHeight &&
    area >= LEFTOVER_THRESHOLDS.minArea
    ? "leftover"
    : "waste";
}

function describeRegion(region: Omit<LeftoverRegion, "label">) {
  const kindLabel = region.kind === "leftover" ? "Leftover" : "Waste";
  return `${kindLabel} ${Math.round(region.width)}×${Math.round(region.height)}`;
}

function chooseOrientationForRow(
  item: ExpandedCutItem,
  remainingWidth: number,
  availableHeight: number,
  currentRowHeight: number
) {
  const options: { width: number; height: number; rotated: boolean }[] = [
    { width: item.width, height: item.height, rotated: false },
  ];

  if (item.allow_rotation && item.width !== item.height) {
    options.push({ width: item.height, height: item.width, rotated: true });
  }

  const fitting = options
    .filter((opt) => opt.width <= remainingWidth && Math.max(currentRowHeight, opt.height) <= availableHeight)
    .sort((a, b) => {
      const aGrowth = Math.max(0, a.height - currentRowHeight);
      const bGrowth = Math.max(0, b.height - currentRowHeight);
      if (aGrowth !== bGrowth) return aGrowth - bGrowth;
      return b.width - a.width;
    });

  return fitting[0] ?? null;
}

function chooseOrientationForStrip(
  item: ExpandedCutItem,
  remainingHeight: number,
  availableWidth: number,
  currentStripWidth: number
) {
  const options: { width: number; height: number; rotated: boolean }[] = [
    { width: item.width, height: item.height, rotated: false },
  ];

  if (item.allow_rotation && item.width !== item.height) {
    options.push({ width: item.height, height: item.width, rotated: true });
  }

  const fitting = options
    .filter((opt) => opt.height <= remainingHeight && Math.max(currentStripWidth, opt.width) <= availableWidth)
    .sort((a, b) => {
      const aGrowth = Math.max(0, a.width - currentStripWidth);
      const bGrowth = Math.max(0, b.width - currentStripWidth);
      if (aGrowth !== bGrowth) return aGrowth - bGrowth;
      return b.height - a.height;
    });

  return fitting[0] ?? null;
}

function buildHorizontalLayout(items: ExpandedCutItem[], sourceWidth: number, sourceHeight: number): LayoutResult {
  const rows: LayoutRow[] = [];
  let currentRow: LayoutRow | null = null;

  const placedCuts: PlacedCut[] = [];
  const unplacedItems: ExpandedCutItem[] = [];

  for (const item of items) {
    if (!currentRow) {
      currentRow = {
        y: rows.reduce((sum, row) => sum + row.height, 0),
        height: 0,
        usedWidth: 0,
        cuts: [],
      };
      rows.push(currentRow);
    }

    const tryPlace = (row: LayoutRow) => {
      const remainingWidth = sourceWidth - row.usedWidth;
      const availableHeight = sourceHeight - row.y;
      return chooseOrientationForRow(item, remainingWidth, availableHeight, row.height);
    };

    let orientation = tryPlace(currentRow);

    if (!orientation) {
      const nextY = currentRow.y + currentRow.height;
      if (nextY >= sourceHeight) {
        unplacedItems.push(item);
        continue;
      }

      currentRow = {
        y: nextY,
        height: 0,
        usedWidth: 0,
        cuts: [],
      };
      rows.push(currentRow);
      orientation = tryPlace(currentRow);
    }

    if (!orientation) {
      unplacedItems.push(item);
      continue;
    }

    const placed: PlacedCut = {
      orderItemId: item.orderItemId,
      label: item.label,
      x: currentRow.usedWidth,
      y: currentRow.y,
      width: orientation.width,
      height: orientation.height,
      rotated: orientation.rotated,
      glass_type: item.glass_type,
      thickness: item.thickness,
    };

    currentRow.cuts.push(placed);
    currentRow.usedWidth += orientation.width;
    currentRow.height = Math.max(currentRow.height, orientation.height);
    placedCuts.push(placed);
  }

  const realRows = rows.filter((row) => row.cuts.length > 0);
  const usedArea = placedCuts.reduce((sum, cut) => sum + cut.width * cut.height, 0);

  const leftoverRegions: LeftoverRegion[] = [];
  const usedHeight = realRows.reduce((sum, row) => sum + row.height, 0);

  for (const row of realRows) {
    const remainingWidth = sourceWidth - row.usedWidth;
    if (remainingWidth > 0 && row.height > 0) {
      const kind = classifyRegion(remainingWidth, row.height);
      leftoverRegions.push({
        x: row.usedWidth,
        y: row.y,
        width: remainingWidth,
        height: row.height,
        kind,
        label: "",
      });
    }
  }

  if (usedHeight < sourceHeight) {
    const remainingHeight = sourceHeight - usedHeight;
    const kind = classifyRegion(sourceWidth, remainingHeight);
    leftoverRegions.push({
      x: 0,
      y: usedHeight,
      width: sourceWidth,
      height: remainingHeight,
      kind,
      label: "",
    });
  }

  const cutSteps: CutStep[] = [];
  let seq = 1;

  for (let i = 0; i < realRows.length - 1; i += 1) {
    const row = realRows[i];
    const position = row.y + row.height;
    cutSteps.push({
      id: `h-row-${i + 1}`,
      sequence: seq,
      orientation: "horizontal",
      position,
      x: 0,
      y: position,
      length: sourceWidth,
      description: `Cut horizontally at ${Math.round(position)}mm to split row ${i + 1}.`,
    });
    seq += 1;
  }

  for (let rowIndex = 0; rowIndex < realRows.length; rowIndex += 1) {
    const row = realRows[rowIndex];
    let runningX = 0;
    for (let i = 0; i < row.cuts.length - 1; i += 1) {
      runningX += row.cuts[i].width;
      cutSteps.push({
        id: `v-row-${rowIndex + 1}-${i + 1}`,
        sequence: seq,
        orientation: "vertical",
        position: runningX,
        x: runningX,
        y: row.y,
        length: row.height,
        description: `Cut vertically at ${Math.round(runningX)}mm inside row ${rowIndex + 1}.`,
      });
      seq += 1;
    }
  }

  const withLabels = leftoverRegions.map((region) => ({ ...region, label: describeRegion(region) }));
  const leftoverArea = withLabels
    .filter((region) => region.kind === "leftover")
    .reduce((sum, region) => sum + region.width * region.height, 0);
  const wasteArea = withLabels
    .filter((region) => region.kind === "waste")
    .reduce((sum, region) => sum + region.width * region.height, 0);

  return {
    placedCuts,
    unplacedItems,
    usedArea,
    leftoverArea,
    wasteArea: Math.max(0, wasteArea),
    layoutWidth: sourceWidth,
    layoutHeight: sourceHeight,
    cutSteps,
    leftoverRegions: withLabels,
    layoutStrategy: "horizontal_shelf",
    cutCount: cutSteps.length,
    usefulLeftoverArea: leftoverArea,
    complexity: realRows.length,
  };
}

function buildVerticalLayout(items: ExpandedCutItem[], sourceWidth: number, sourceHeight: number): LayoutResult {
  const strips: LayoutStrip[] = [];
  let currentStrip: LayoutStrip | null = null;

  const placedCuts: PlacedCut[] = [];
  const unplacedItems: ExpandedCutItem[] = [];

  for (const item of items) {
    if (!currentStrip) {
      currentStrip = {
        x: strips.reduce((sum, strip) => sum + strip.width, 0),
        width: 0,
        usedHeight: 0,
        cuts: [],
      };
      strips.push(currentStrip);
    }

    const tryPlace = (strip: LayoutStrip) => {
      const remainingHeight = sourceHeight - strip.usedHeight;
      const availableWidth = sourceWidth - strip.x;
      return chooseOrientationForStrip(item, remainingHeight, availableWidth, strip.width);
    };

    let orientation = tryPlace(currentStrip);

    if (!orientation) {
      const nextX = currentStrip.x + currentStrip.width;
      if (nextX >= sourceWidth) {
        unplacedItems.push(item);
        continue;
      }

      currentStrip = {
        x: nextX,
        width: 0,
        usedHeight: 0,
        cuts: [],
      };
      strips.push(currentStrip);
      orientation = tryPlace(currentStrip);
    }

    if (!orientation) {
      unplacedItems.push(item);
      continue;
    }

    const placed: PlacedCut = {
      orderItemId: item.orderItemId,
      label: item.label,
      x: currentStrip.x,
      y: currentStrip.usedHeight,
      width: orientation.width,
      height: orientation.height,
      rotated: orientation.rotated,
      glass_type: item.glass_type,
      thickness: item.thickness,
    };

    currentStrip.cuts.push(placed);
    currentStrip.usedHeight += orientation.height;
    currentStrip.width = Math.max(currentStrip.width, orientation.width);
    placedCuts.push(placed);
  }

  const realStrips = strips.filter((strip) => strip.cuts.length > 0);
  const usedArea = placedCuts.reduce((sum, cut) => sum + cut.width * cut.height, 0);

  const leftoverRegions: LeftoverRegion[] = [];
  const usedWidth = realStrips.reduce((sum, strip) => sum + strip.width, 0);

  for (const strip of realStrips) {
    const remainingHeight = sourceHeight - strip.usedHeight;
    if (remainingHeight > 0 && strip.width > 0) {
      const kind = classifyRegion(strip.width, remainingHeight);
      leftoverRegions.push({
        x: strip.x,
        y: strip.usedHeight,
        width: strip.width,
        height: remainingHeight,
        kind,
        label: "",
      });
    }
  }

  if (usedWidth < sourceWidth) {
    const remainingWidth = sourceWidth - usedWidth;
    const kind = classifyRegion(remainingWidth, sourceHeight);
    leftoverRegions.push({
      x: usedWidth,
      y: 0,
      width: remainingWidth,
      height: sourceHeight,
      kind,
      label: "",
    });
  }

  const cutSteps: CutStep[] = [];
  let seq = 1;

  for (let i = 0; i < realStrips.length - 1; i += 1) {
    const strip = realStrips[i];
    const position = strip.x + strip.width;
    cutSteps.push({
      id: `v-strip-${i + 1}`,
      sequence: seq,
      orientation: "vertical",
      position,
      x: position,
      y: 0,
      length: sourceHeight,
      description: `Cut vertically at ${Math.round(position)}mm to split strip ${i + 1}.`,
    });
    seq += 1;
  }

  for (let stripIndex = 0; stripIndex < realStrips.length; stripIndex += 1) {
    const strip = realStrips[stripIndex];
    let runningY = 0;
    for (let i = 0; i < strip.cuts.length - 1; i += 1) {
      runningY += strip.cuts[i].height;
      cutSteps.push({
        id: `h-strip-${stripIndex + 1}-${i + 1}`,
        sequence: seq,
        orientation: "horizontal",
        position: runningY,
        x: strip.x,
        y: runningY,
        length: strip.width,
        description: `Cut horizontally at ${Math.round(runningY)}mm inside strip ${stripIndex + 1}.`,
      });
      seq += 1;
    }
  }

  const withLabels = leftoverRegions.map((region) => ({ ...region, label: describeRegion(region) }));
  const leftoverArea = withLabels
    .filter((region) => region.kind === "leftover")
    .reduce((sum, region) => sum + region.width * region.height, 0);
  const wasteArea = withLabels
    .filter((region) => region.kind === "waste")
    .reduce((sum, region) => sum + region.width * region.height, 0);

  return {
    placedCuts,
    unplacedItems,
    usedArea,
    leftoverArea,
    wasteArea: Math.max(0, wasteArea),
    layoutWidth: sourceWidth,
    layoutHeight: sourceHeight,
    cutSteps,
    leftoverRegions: withLabels,
    layoutStrategy: "vertical_strip",
    cutCount: cutSteps.length,
    usefulLeftoverArea: leftoverArea,
    complexity: realStrips.length,
  };
}

function layoutScore(result: LayoutResult) {
  const placedCount = result.placedCuts.length;
  const unplacedPenalty = result.unplacedItems.length * 1500;
  const cutPenalty = result.cutCount * 16;
  const wastePenalty = result.wasteArea / 120;
  const usefulLeftoverBonus = result.usefulLeftoverArea / 250;
  const simplicityBonus = Math.max(0, 100 - result.complexity * 8);

  return placedCount * 2500 + result.usedArea / 100 - unplacedPenalty - cutPenalty - wastePenalty + usefulLeftoverBonus + simplicityBonus;
}

function pickBestLayout(items: ExpandedCutItem[], sourceWidth: number, sourceHeight: number): LayoutResult {
  const horizontal = buildHorizontalLayout(items, sourceWidth, sourceHeight);
  const vertical = buildVerticalLayout(items, sourceWidth, sourceHeight);

  const scored = [horizontal, vertical].sort((a, b) => {
    const scoreDiff = layoutScore(b) - layoutScore(a);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.unplacedItems.length !== b.unplacedItems.length) {
      return a.unplacedItems.length - b.unplacedItems.length;
    }
    return a.cutCount - b.cutCount;
  });

  return scored[0];
}

function scorePlan(plan: CutPlan) {
  const fulfilledScore = plan.fulfilled ? 1_000_000 : -plan.unplacedItems.length * 20_000;
  const fulfilledSourcePriorityBonus = plan.fulfilled ? 400_000 - plan.usedSourceCount * 120_000 : 0;
  const leftoverBonus = plan.sources.reduce((sum, source) => {
    return sum + (normalize(source.sourcePiece.rack) === "leftovers" ? 12_000 : 0);
  }, 0);
  const sourcePenalty = plan.usedSourceCount * 8_000;
  const wastePenalty = plan.totalWaste / 50;
  const cutPenalty = plan.sources.reduce((sum, source) => sum + source.cutCount, 0) * 80;
  const usefulLeftoverBonus = plan.sources
    .flatMap((source) => source.leftoverRegions)
    .filter((region) => region.kind === "leftover")
    .reduce((sum, region) => sum + region.width * region.height, 0) / 400;
  const simplicityBonus = plan.sources.reduce((sum, source) => {
    return sum + Math.max(0, 300 - source.cutSteps.length * 12);
  }, 0);

  return (
    fulfilledScore +
    fulfilledSourcePriorityBonus +
    leftoverBonus +
    usefulLeftoverBonus +
    simplicityBonus -
    sourcePenalty -
    wastePenalty -
    cutPenalty
  );
}

export function generateCutPlans(orderItems: CutPlanOrderItem[], glassPieces: GlassPiece[]): CutPlan[] {
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

      let remaining = [...group.items];

      for (const candidate of candidates) {
        if (!remaining.length) break;

        const pieceWidth = toNumber(candidate.width);
        const pieceHeight = toNumber(candidate.height);
        const layout = pickBestLayout(remaining, pieceWidth, pieceHeight);

        if (!layout.placedCuts.length) continue;

        planSources.push({
          sourcePiece: candidate,
          placedCuts: layout.placedCuts,
          usedArea: layout.usedArea,
          leftoverArea: layout.leftoverArea,
          wasteArea: layout.wasteArea,
          layoutWidth: layout.layoutWidth,
          layoutHeight: layout.layoutHeight,
          cutSteps: layout.cutSteps,
          leftoverRegions: layout.leftoverRegions,
          layoutStrategy: layout.layoutStrategy,
          cutCount: layout.cutCount,
        });

        remaining = layout.unplacedItems;
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
