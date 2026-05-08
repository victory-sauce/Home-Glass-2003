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
  unusedArea: number;
  usefulLeftoverArea: number;
  wasteArea: number;
  layoutWidth: number;
  layoutHeight: number;
  cutSteps: CutStep[];
  leftoverRegions: LeftoverRegion[];
  wasteRegions: LeftoverRegion[];
  layoutStrategy: "horizontal_shelf" | "vertical_strip";
  cutCount: number;
}

export interface PlanScoreBreakdown {
  totalSourceArea: number;
  totalSourceAreaSqFt: number;
  requiredArea: number;
  requiredAreaSqFt: number;
  unusedArea: number;
  unusableWasteArea: number;
  reusableLeftoverArea: number;
  skinnyPenalty: number;
  stockPreferencePenalty: number;
  sheetCountPenalty: number;
  sheetCount: number;
}

export interface CutPlanDebug {
  scoreBreakdown: PlanScoreBreakdown;
  reusableLeftoverRectangles: LeftoverRegion[];
  unusableWasteRectangles: LeftoverRegion[];
  winnerReason: string;
  comparedAlternatives: PlanAlternativeSummary[];
  scoreBreakdownScores: {
    totalSourceAreaScore: number;
    unusableWasteScore: number;
    reusableLeftoverScore: number;
    skinnyLeftoverPenalty: number;
    stockSizePreferencePenalty: number;
    sheetCountPenalty: number;
  };
}
export interface PlanAlternativeSummary {
  id: string;
  rank: number;
  sourceSheets: string[];
  totalSourceAreaSqFt: number;
  requiredCutAreaSqFt: number;
  leftoverAreaSqFt: number;
  reusableLeftoverAreaSqFt: number;
  unusableWasteAreaSqFt: number;
  sheetCount: number;
  finalScore: number;
  resultReason: string;
}

export interface CutPlan {
  id: string;
  fulfilled: boolean;
  sources: CutPlanSource[];
  totalWaste: number;
  usedSourceCount: number;
  unplacedItems: ExpandedCutItem[];
  score: number;
  debug: CutPlanDebug;
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
  unusedArea: number;
  usefulLeftoverArea: number;
  wasteArea: number;
  layoutWidth: number;
  layoutHeight: number;
  cutSteps: CutStep[];
  leftoverRegions: LeftoverRegion[];
  wasteRegions: LeftoverRegion[];
  layoutStrategy: "horizontal_shelf" | "vertical_strip";
  cutCount: number;
  complexity: number;
}

interface OrientationOption {
  width: number;
  height: number;
  rotated: boolean;
}

const LEFTOVER_THRESHOLDS = {
  minWidth: 150,
  minHeight: 150,
  minArea: 40_000,
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

function sourceArea(piece: GlassPiece) {
  return toNumber(piece.width) * toNumber(piece.height);
}

function isWasteComparable(a: number, b: number) {
  const delta = Math.abs(a - b);
  const baseline = Math.max(20_000, Math.min(a, b) * 0.12);
  return delta <= baseline;
}

export function classifyLeftoverRegion(width: number, height: number): "leftover" | "waste" {
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
export function explainLeftoverReason(region: LeftoverRegion) {
  if (region.kind === "leftover") return "reusable clean rectangle";
  const shortSide = Math.min(region.width, region.height);
  const area = region.width * region.height;
  if (shortSide < LEFTOVER_THRESHOLDS.minWidth || shortSide < LEFTOVER_THRESHOLDS.minHeight) return "too skinny";
  if (area < LEFTOVER_THRESHOLDS.minArea) return "below minimum useful size";
  return "unusable";
}

function getOrientationOptions(item: ExpandedCutItem): OrientationOption[] {
  const options: OrientationOption[] = [{ width: item.width, height: item.height, rotated: false }];
  if (item.allow_rotation && item.width !== item.height) {
    options.push({ width: item.height, height: item.width, rotated: true });
  }
  return options;
}

function fittingRowOrientations(
  item: ExpandedCutItem,
  remainingWidth: number,
  availableHeight: number,
  currentRowHeight: number
) {
  return getOrientationOptions(item)
    .filter((opt) => opt.width <= remainingWidth && Math.max(currentRowHeight, opt.height) <= availableHeight)
    .sort((a, b) => {
      const aGrowth = Math.max(0, a.height - currentRowHeight);
      const bGrowth = Math.max(0, b.height - currentRowHeight);
      if (aGrowth !== bGrowth) return aGrowth - bGrowth;
      return b.width - a.width;
    });
}

function fittingStripOrientations(
  item: ExpandedCutItem,
  remainingHeight: number,
  availableWidth: number,
  currentStripWidth: number
) {
  return getOrientationOptions(item)
    .filter((opt) => opt.height <= remainingHeight && Math.max(currentStripWidth, opt.width) <= availableWidth)
    .sort((a, b) => {
      const aGrowth = Math.max(0, a.width - currentStripWidth);
      const bGrowth = Math.max(0, b.width - currentStripWidth);
      if (aGrowth !== bGrowth) return aGrowth - bGrowth;
      return b.height - a.height;
    });
}

function buildHorizontalLayout(items: ExpandedCutItem[], sourceWidth: number, sourceHeight: number): LayoutResult {
  type HorizontalState = {
    rows: LayoutRow[];
    placedCuts: PlacedCut[];
    unplacedItems: ExpandedCutItem[];
  };

  const stateScore = (state: HorizontalState) => {
    const placedArea = state.placedCuts.reduce((sum, cut) => sum + cut.width * cut.height, 0);
    return state.placedCuts.length * 200_000 + placedArea - state.unplacedItems.length * 600_000;
  };

  // Generic beam-search: this explicitly evaluates both orientations for each rotatable item.
  let states: HorizontalState[] = [{ rows: [], placedCuts: [], unplacedItems: [] }];
  const beamWidth = 12;

  for (const item of items) {
    const nextStates: HorizontalState[] = [];

    for (const state of states) {
      const rows = state.rows.length ? state.rows : [{ y: 0, height: 0, usedWidth: 0, cuts: [] }];
      const currentRow = rows[rows.length - 1];
      const currentRowFits = fittingRowOrientations(
        item,
        sourceWidth - currentRow.usedWidth,
        sourceHeight - currentRow.y,
        currentRow.height
      ).map((orientation) => ({ orientation, startNewRow: false }));

      const nextY = currentRow.y + currentRow.height;
      const nextRowFits =
        nextY < sourceHeight
          ? fittingRowOrientations(item, sourceWidth, sourceHeight - nextY, 0).map((orientation) => ({
              orientation,
              startNewRow: state.rows.length > 0,
            }))
          : [];
      const placementOptions = [...currentRowFits, ...nextRowFits];

      if (!placementOptions.length) {
        nextStates.push({
          rows: rows.map((row) => ({ ...row, cuts: [...row.cuts] })),
          placedCuts: [...state.placedCuts],
          unplacedItems: [...state.unplacedItems, item],
        });
        continue;
      }

      for (const option of placementOptions) {
        const clonedRows = rows.map((row) => ({ ...row, cuts: [...row.cuts] }));
        if (!state.rows.length) {
          // no-op, rows already seeded with row zero
        } else if (option.startNewRow) {
          clonedRows.push({ y: nextY, height: 0, usedWidth: 0, cuts: [] });
        }
        const targetRow = clonedRows[clonedRows.length - 1];
        const placed: PlacedCut = {
          orderItemId: item.orderItemId,
          label: item.label,
          x: targetRow.usedWidth,
          y: targetRow.y,
          width: option.orientation.width,
          height: option.orientation.height,
          rotated: option.orientation.rotated,
          glass_type: item.glass_type,
          thickness: item.thickness,
        };
        targetRow.cuts.push(placed);
        targetRow.usedWidth += option.orientation.width;
        targetRow.height = Math.max(targetRow.height, option.orientation.height);
        nextStates.push({
          rows: clonedRows,
          placedCuts: [...state.placedCuts, placed],
          unplacedItems: [...state.unplacedItems],
        });
      }
    }

    states = nextStates.sort((a, b) => stateScore(b) - stateScore(a)).slice(0, beamWidth);
  }

  const bestState = states.sort((a, b) => stateScore(b) - stateScore(a))[0] ?? {
    rows: [],
    placedCuts: [],
    unplacedItems: [...items],
  };
  const rows = bestState.rows;
  const placedCuts = bestState.placedCuts;
  const unplacedItems = bestState.unplacedItems;

  const realRows = rows.filter((row) => row.cuts.length > 0);
  const usedArea = placedCuts.reduce((sum, cut) => sum + cut.width * cut.height, 0);

  const leftoverRegions: LeftoverRegion[] = [];
  const usedHeight = realRows.reduce((sum, row) => sum + row.height, 0);

  for (const row of realRows) {
    const remainingWidth = sourceWidth - row.usedWidth;
    if (remainingWidth > 0 && row.height > 0) {
      const kind = classifyLeftoverRegion(remainingWidth, row.height);
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
    const kind = classifyLeftoverRegion(sourceWidth, remainingHeight);
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
  const usefulLeftoverRegions = withLabels.filter((region) => region.kind === "leftover");
  const wasteRegions = withLabels.filter((region) => region.kind === "waste");
  const usefulLeftoverArea = usefulLeftoverRegions.reduce((sum, region) => sum + region.width * region.height, 0);
  const wasteArea = wasteRegions.reduce((sum, region) => sum + region.width * region.height, 0);
  const unusedArea = withLabels.reduce((sum, region) => sum + region.width * region.height, 0);

  return {
    placedCuts,
    unplacedItems,
    usedArea,
    leftoverArea: usefulLeftoverArea,
    unusedArea,
    usefulLeftoverArea,
    wasteArea: Math.max(0, wasteArea),
    layoutWidth: sourceWidth,
    layoutHeight: sourceHeight,
    cutSteps,
    leftoverRegions: usefulLeftoverRegions,
    wasteRegions,
    layoutStrategy: "horizontal_shelf",
    cutCount: cutSteps.length,
    complexity: realRows.length,
  };
}

function buildVerticalLayout(items: ExpandedCutItem[], sourceWidth: number, sourceHeight: number): LayoutResult {
  type VerticalState = {
    strips: LayoutStrip[];
    placedCuts: PlacedCut[];
    unplacedItems: ExpandedCutItem[];
  };

  const stateScore = (state: VerticalState) => {
    const placedArea = state.placedCuts.reduce((sum, cut) => sum + cut.width * cut.height, 0);
    return state.placedCuts.length * 200_000 + placedArea - state.unplacedItems.length * 600_000;
  };

  let states: VerticalState[] = [{ strips: [], placedCuts: [], unplacedItems: [] }];
  const beamWidth = 12;

  for (const item of items) {
    const nextStates: VerticalState[] = [];

    for (const state of states) {
      const strips = state.strips.length ? state.strips : [{ x: 0, width: 0, usedHeight: 0, cuts: [] }];
      const currentStrip = strips[strips.length - 1];
      const currentStripFits = fittingStripOrientations(
        item,
        sourceHeight - currentStrip.usedHeight,
        sourceWidth - currentStrip.x,
        currentStrip.width
      ).map((orientation) => ({ orientation, startNewStrip: false }));

      const nextX = currentStrip.x + currentStrip.width;
      const nextStripFits =
        nextX < sourceWidth
          ? fittingStripOrientations(item, sourceHeight, sourceWidth - nextX, 0).map((orientation) => ({
              orientation,
              startNewStrip: state.strips.length > 0,
            }))
          : [];
      const placementOptions = [...currentStripFits, ...nextStripFits];

      if (!placementOptions.length) {
        nextStates.push({
          strips: strips.map((strip) => ({ ...strip, cuts: [...strip.cuts] })),
          placedCuts: [...state.placedCuts],
          unplacedItems: [...state.unplacedItems, item],
        });
        continue;
      }

      for (const option of placementOptions) {
        const clonedStrips = strips.map((strip) => ({ ...strip, cuts: [...strip.cuts] }));
        if (!state.strips.length) {
          // no-op, strip zero already seeded
        } else if (option.startNewStrip) {
          clonedStrips.push({ x: nextX, width: 0, usedHeight: 0, cuts: [] });
        }
        const targetStrip = clonedStrips[clonedStrips.length - 1];
        const placed: PlacedCut = {
          orderItemId: item.orderItemId,
          label: item.label,
          x: targetStrip.x,
          y: targetStrip.usedHeight,
          width: option.orientation.width,
          height: option.orientation.height,
          rotated: option.orientation.rotated,
          glass_type: item.glass_type,
          thickness: item.thickness,
        };
        targetStrip.cuts.push(placed);
        targetStrip.usedHeight += option.orientation.height;
        targetStrip.width = Math.max(targetStrip.width, option.orientation.width);
        nextStates.push({
          strips: clonedStrips,
          placedCuts: [...state.placedCuts, placed],
          unplacedItems: [...state.unplacedItems],
        });
      }
    }

    states = nextStates.sort((a, b) => stateScore(b) - stateScore(a)).slice(0, beamWidth);
  }

  const bestState = states.sort((a, b) => stateScore(b) - stateScore(a))[0] ?? {
    strips: [],
    placedCuts: [],
    unplacedItems: [...items],
  };
  const strips = bestState.strips;
  const placedCuts = bestState.placedCuts;
  const unplacedItems = bestState.unplacedItems;

  const realStrips = strips.filter((strip) => strip.cuts.length > 0);
  const usedArea = placedCuts.reduce((sum, cut) => sum + cut.width * cut.height, 0);

  const leftoverRegions: LeftoverRegion[] = [];
  const usedWidth = realStrips.reduce((sum, strip) => sum + strip.width, 0);

  for (const strip of realStrips) {
    const remainingHeight = sourceHeight - strip.usedHeight;
    if (remainingHeight > 0 && strip.width > 0) {
      const kind = classifyLeftoverRegion(strip.width, remainingHeight);
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
    const kind = classifyLeftoverRegion(remainingWidth, sourceHeight);
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
  const usefulLeftoverRegions = withLabels.filter((region) => region.kind === "leftover");
  const wasteRegions = withLabels.filter((region) => region.kind === "waste");
  const usefulLeftoverArea = usefulLeftoverRegions.reduce((sum, region) => sum + region.width * region.height, 0);
  const wasteArea = wasteRegions.reduce((sum, region) => sum + region.width * region.height, 0);
  const unusedArea = withLabels.reduce((sum, region) => sum + region.width * region.height, 0);

  return {
    placedCuts,
    unplacedItems,
    usedArea,
    leftoverArea: usefulLeftoverArea,
    unusedArea,
    usefulLeftoverArea,
    wasteArea: Math.max(0, wasteArea),
    layoutWidth: sourceWidth,
    layoutHeight: sourceHeight,
    cutSteps,
    leftoverRegions: usefulLeftoverRegions,
    wasteRegions,
    layoutStrategy: "vertical_strip",
    cutCount: cutSteps.length,
    complexity: realStrips.length,
  };
}

function layoutScore(result: LayoutResult) {
  const placedCount = result.placedCuts.length;
  const unplacedPenalty = result.unplacedItems.length * 1500;
  const cutPenalty = result.cutCount * 16;
  const wastePenalty = result.wasteArea / 120;
  const usefulLeftoverBonus = result.usefulLeftoverArea / 1200;
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


function mm2ToSqFt(areaMm2: number) {
  return areaMm2 / 92_903.04;
}

function skinnyPenaltyForRegion(region: LeftoverRegion) {
  const shortSide = Math.min(region.width, region.height);
  if (shortSide >= 250) return 0;
  if (shortSide >= 150) return 1;
  if (shortSide >= 100) return 3;
  return 8;
}

function computePlanBreakdown(plan: CutPlan): PlanScoreBreakdown {
  const totalSourceArea = plan.sources.reduce((sum, source) => sum + sourceArea(source.sourcePiece), 0);
  const requiredArea = plan.sources.reduce((sum, source) => sum + source.usedArea, 0);
  const unusedArea = plan.sources.reduce((sum, source) => sum + source.unusedArea, 0);
  const unusableWasteArea = plan.sources.reduce((sum, source) => sum + source.wasteArea, 0);
  const reusableLeftoverArea = plan.sources.reduce((sum, source) => sum + source.usefulLeftoverArea, 0);
  const skinnyPenalty = plan.sources.reduce(
    (sum, source) => sum + [...source.leftoverRegions, ...source.wasteRegions].reduce((n, region) => n + skinnyPenaltyForRegion(region), 0),
    0
  );
  const stockPreferencePenalty = plan.sources.reduce((sum, source) => {
    const width = toNumber(source.sourcePiece.width);
    return sum + (width > 1500 ? (width - 1500) * 4_000 : 0);
  }, 0);
  const sheetCountPenalty = plan.usedSourceCount * 100;

  return {
    totalSourceArea,
    totalSourceAreaSqFt: mm2ToSqFt(totalSourceArea),
    requiredArea,
    requiredAreaSqFt: mm2ToSqFt(requiredArea),
    unusedArea,
    unusableWasteArea,
    reusableLeftoverArea,
    skinnyPenalty,
    stockPreferencePenalty,
    sheetCountPenalty,
    sheetCount: plan.usedSourceCount,
  };
}

function scorePlan(plan: CutPlan) {
  const breakdown = computePlanBreakdown(plan);
  return (
    -plan.unplacedItems.length * 1_000_000_000 -
    Math.round(breakdown.totalSourceArea) * 1_000 -
    Math.round(breakdown.unusableWasteArea) * 400 -
    breakdown.skinnyPenalty * 2_000_000 -
    breakdown.stockPreferencePenalty -
    Math.round(breakdown.reusableLeftoverArea) * 10 +
    -breakdown.sheetCountPenalty
  );
}
function scoreComponents(breakdown: PlanScoreBreakdown) {
  return {
    totalSourceAreaScore: Math.round(breakdown.totalSourceArea) * -1_000,
    unusableWasteScore: Math.round(breakdown.unusableWasteArea) * -400,
    reusableLeftoverScore: Math.round(breakdown.reusableLeftoverArea) * -10,
    skinnyLeftoverPenalty: breakdown.skinnyPenalty * -2_000_000,
    stockSizePreferencePenalty: -breakdown.stockPreferencePenalty,
    sheetCountPenalty: -breakdown.sheetCountPenalty,
  };
}

function compareCandidateLayouts(
  a: { candidate: GlassPiece; layout: LayoutResult },
  b: { candidate: GlassPiece; layout: LayoutResult }
) {
  // a) fewer unplaced items
  if (a.layout.unplacedItems.length !== b.layout.unplacedItems.length) {
    return a.layout.unplacedItems.length - b.layout.unplacedItems.length;
  }

  // c) smaller adequate source
  const aArea = sourceArea(a.candidate);
  const bArea = sourceArea(b.candidate);
  if (aArea !== bArea) return aArea - bArea;

  // d) lower waste
  if (a.layout.wasteArea !== b.layout.wasteArea) {
    return a.layout.wasteArea - b.layout.wasteArea;
  }

  // h) prefer leftovers only when waste is comparable
  if (isWasteComparable(a.layout.wasteArea, b.layout.wasteArea)) {
    const aLeftovers = normalize(a.candidate.rack) === "leftovers";
    const bLeftovers = normalize(b.candidate.rack) === "leftovers";
    if (aLeftovers !== bLeftovers) {
      return aLeftovers ? -1 : 1;
    }
  }

  // f) useful leftover as secondary signal
  if (a.layout.usefulLeftoverArea !== b.layout.usefulLeftoverArea) {
    return b.layout.usefulLeftoverArea - a.layout.usefulLeftoverArea;
  }

  // g) cleaner layouts
  if (a.layout.cutCount !== b.layout.cutCount) {
    return a.layout.cutCount - b.layout.cutCount;
  }

  return (a.candidate.rack_order ?? 0) - (b.candidate.rack_order ?? 0);
}

function comparePlans(a: CutPlan, b: CutPlan) {
  if (a.unplacedItems.length !== b.unplacedItems.length) return a.unplacedItems.length - b.unplacedItems.length;
  const ab = computePlanBreakdown(a);
  const bb = computePlanBreakdown(b);
  if (ab.totalSourceArea !== bb.totalSourceArea) return ab.totalSourceArea - bb.totalSourceArea;
  if (ab.unusableWasteArea !== bb.unusableWasteArea) return ab.unusableWasteArea - bb.unusableWasteArea;
  if (ab.skinnyPenalty !== bb.skinnyPenalty) return ab.skinnyPenalty - bb.skinnyPenalty;
  if (ab.stockPreferencePenalty !== bb.stockPreferencePenalty) return ab.stockPreferencePenalty - bb.stockPreferencePenalty;
  if (ab.reusableLeftoverArea !== bb.reusableLeftoverArea) return bb.reusableLeftoverArea - ab.reusableLeftoverArea;
  if (a.usedSourceCount !== b.usedSourceCount) return a.usedSourceCount - b.usedSourceCount;
  return b.score - a.score;
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
        debug: {
          scoreBreakdown: {
            totalSourceArea: 0,totalSourceAreaSqFt: 0,requiredArea: 0,requiredAreaSqFt: 0,unusedArea: 0,unusableWasteArea: 0,reusableLeftoverArea: 0,skinnyPenalty: 0,stockPreferencePenalty: 0,sheetCountPenalty: 0,sheetCount: 0,
          },
          reusableLeftoverRectangles: [],
          unusableWasteRectangles: [],
          winnerReason: "No items to cut.",
          comparedAlternatives: [],
          scoreBreakdownScores: {
            totalSourceAreaScore: 0, unusableWasteScore: 0, reusableLeftoverScore: 0, skinnyLeftoverPenalty: 0, stockSizePreferencePenalty: 0, sheetCountPenalty: 0,
          },
        },
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
          if (pa.area !== pb.area) return pa.area - pb.area;
          if (pa.waste !== pb.waste) return pa.waste - pb.waste;
          return pa.rackOrder - pb.rackOrder;
        });

      type GroupState = {
        sources: CutPlanSource[];
        remaining: ExpandedCutItem[];
        availableCandidates: GlassPiece[];
      };
      const stateOrder = (a: GroupState, b: GroupState) => {
        if (a.remaining.length !== b.remaining.length) return a.remaining.length - b.remaining.length;
        const aArea = a.sources.reduce((sum, source) => sum + sourceArea(source.sourcePiece), 0);
        const bArea = b.sources.reduce((sum, source) => sum + sourceArea(source.sourcePiece), 0);
        if (aArea !== bArea) return aArea - bArea;
        const aWaste = a.sources.reduce((sum, source) => sum + source.wasteArea, 0);
        const bWaste = b.sources.reduce((sum, source) => sum + source.wasteArea, 0);
        if (aWaste !== bWaste) return aWaste - bWaste;
        const aLeftover = a.sources.reduce((sum, source) => sum + source.usefulLeftoverArea, 0);
        const bLeftover = b.sources.reduce((sum, source) => sum + source.usefulLeftoverArea, 0);
        if (aLeftover !== bLeftover) return bLeftover - aLeftover;
        if (a.sources.length !== b.sources.length) return a.sources.length - b.sources.length;
        return 0;
      };

      let states: GroupState[] = [{ sources: [], remaining: [...group.items], availableCandidates: [...candidates] }];
      const beamWidth = 10;

      while (states.some((state) => state.remaining.length > 0 && state.availableCandidates.length > 0)) {
        const nextStates: GroupState[] = [];
        for (const state of states) {
          if (!state.remaining.length || !state.availableCandidates.length) {
            nextStates.push(state);
            continue;
          }
          const evaluated = state.availableCandidates
            .map((candidate) => {
              const layout = pickBestLayout(state.remaining, toNumber(candidate.width), toNumber(candidate.height));
              return { candidate, layout };
            })
            .filter((entry) => entry.layout.placedCuts.length > 0)
            .sort(compareCandidateLayouts)
            .slice(0, 4);

          if (!evaluated.length) {
            nextStates.push(state);
            continue;
          }

          for (const option of evaluated) {
            const addedSource: CutPlanSource = {
              sourcePiece: option.candidate,
              placedCuts: option.layout.placedCuts,
              usedArea: option.layout.usedArea,
              leftoverArea: option.layout.leftoverArea,
              unusedArea: option.layout.unusedArea,
              usefulLeftoverArea: option.layout.usefulLeftoverArea,
              wasteArea: option.layout.wasteArea,
              layoutWidth: option.layout.layoutWidth,
              layoutHeight: option.layout.layoutHeight,
              cutSteps: option.layout.cutSteps,
              leftoverRegions: option.layout.leftoverRegions,
              wasteRegions: option.layout.wasteRegions,
              layoutStrategy: option.layout.layoutStrategy,
              cutCount: option.layout.cutCount,
            };

            nextStates.push({
              sources: [...state.sources, addedSource],
              remaining: option.layout.unplacedItems,
              availableCandidates: state.availableCandidates.filter((piece) => piece.id !== option.candidate.id),
            });
          }
        }
        states = nextStates.sort(stateOrder).slice(0, beamWidth);
      }

      const bestState = states.sort(stateOrder)[0];
      if (bestState) {
        planSources.push(...bestState.sources);
        unplaced.push(...bestState.remaining);
      } else {
        unplaced.push(...group.items);
      }
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
      debug: {
        scoreBreakdown: {
          totalSourceArea: 0,totalSourceAreaSqFt: 0,requiredArea: 0,requiredAreaSqFt: 0,unusedArea: 0,unusableWasteArea: 0,reusableLeftoverArea: 0,skinnyPenalty: 0,stockPreferencePenalty: 0,sheetCountPenalty: 0,sheetCount: 0,
        },
        reusableLeftoverRectangles: [],
        unusableWasteRectangles: [],
        winnerReason: "",
        comparedAlternatives: [],
        scoreBreakdownScores: {
          totalSourceAreaScore: 0, unusableWasteScore: 0, reusableLeftoverScore: 0, skinnyLeftoverPenalty: 0, stockSizePreferencePenalty: 0, sheetCountPenalty: 0,
        },
      },
    };

    plan.score = scorePlan(plan);
    const breakdown = computePlanBreakdown(plan);
    plan.debug = {
      scoreBreakdown: breakdown,
      reusableLeftoverRectangles: plan.sources.flatMap((source) => source.leftoverRegions),
      unusableWasteRectangles: plan.sources.flatMap((source) => source.wasteRegions),
      winnerReason: `Source area ${breakdown.totalSourceAreaSqFt.toFixed(2)} sq ft, waste ${mm2ToSqFt(breakdown.unusableWasteArea).toFixed(2)} sq ft, sheets ${breakdown.sheetCount}.`,
      comparedAlternatives: [],
      scoreBreakdownScores: scoreComponents(breakdown),
    };
    plans.push(plan);
  }
  const sorted = plans.sort(comparePlans);
  const winner = sorted[0];
  const compared = sorted.slice(0, 5).map((plan, index) => {
    const breakdown = computePlanBreakdown(plan);
    return {
      id: plan.id,
      rank: index + 1,
      sourceSheets: plan.sources.map((source) => source.sourcePiece.code),
      totalSourceAreaSqFt: breakdown.totalSourceAreaSqFt,
      requiredCutAreaSqFt: breakdown.requiredAreaSqFt,
      leftoverAreaSqFt: mm2ToSqFt(breakdown.unusedArea),
      reusableLeftoverAreaSqFt: mm2ToSqFt(breakdown.reusableLeftoverArea),
      unusableWasteAreaSqFt: mm2ToSqFt(breakdown.unusableWasteArea),
      sheetCount: plan.usedSourceCount,
      finalScore: plan.score,
      resultReason: plan.unplacedItems.length ? `${plan.unplacedItems.length} cuts unplaced` : "viable candidate",
    };
  });
  const runnerUp = sorted[1];
  if (winner) {
    const wb = computePlanBreakdown(winner);
    const rb = runnerUp ? computePlanBreakdown(runnerUp) : null;
    winner.debug.winnerReason = runnerUp
      ? `Recommended because it uses ${wb.totalSourceAreaSqFt.toFixed(2)} sq ft, saving ${(rb!.totalSourceAreaSqFt - wb.totalSourceAreaSqFt).toFixed(2)} sq ft compared with the ${rb!.totalSourceAreaSqFt.toFixed(2)} sq ft alternative.`
      : `Recommended because it uses ${wb.totalSourceAreaSqFt.toFixed(2)} sq ft with ${mm2ToSqFt(wb.unusableWasteArea).toFixed(2)} sq ft unusable waste.`;
  }
  sorted.forEach((plan) => {
    plan.debug.comparedAlternatives = compared;
  });
  return sorted;
}
