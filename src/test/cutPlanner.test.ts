import { describe, expect, it } from "vitest";

import { generateCutPlans, type CutPlanOrderItem } from "@/lib/cutPlanner";
import type { GlassPiece } from "@/lib/supabase";

describe("generateCutPlans", () => {
  it("fits 1250×1480 and 480×1500 on one 1500×1820 sheet via rotated vertical stacking", () => {
    const sourceSheet: GlassPiece = {
      id: "sheet-1",
      code: "S-1500x1820",
      width: 1500,
      height: 1820,
      thickness: 6,
      glass_type: "clear",
      status: "available",
      rack: "A",
      rack_order: 1,
      parent_piece_id: null,
      reserved_order_id: null,
    };

    const orderItems: CutPlanOrderItem[] = [
      {
        id: "item-a",
        width: 1250,
        height: 1480,
        quantity: 1,
        thickness: 6,
        glass_type: "clear",
        allow_rotation: true,
      },
      {
        id: "item-b",
        width: 480,
        height: 1500,
        quantity: 1,
        thickness: 6,
        glass_type: "clear",
        allow_rotation: true,
      },
    ];

    const [bestPlan] = generateCutPlans(orderItems, [sourceSheet]);

    expect(bestPlan.fulfilled).toBe(true);
    expect(bestPlan.usedSourceCount).toBe(1);
    expect(bestPlan.unplacedItems).toHaveLength(0);

    const [usedSheet] = bestPlan.sources;
    expect(usedSheet.layoutWidth).toBe(1500);
    expect(usedSheet.layoutHeight).toBe(1820);

    expect(usedSheet.placedCuts).toEqual([
      expect.objectContaining({
        orderItemId: "item-a",
        x: 0,
        y: 0,
        width: 1480,
        height: 1250,
        rotated: true,
      }),
      expect.objectContaining({
        orderItemId: "item-b",
        x: 0,
        y: 1250,
        width: 1500,
        height: 480,
        rotated: true,
      }),
    ]);

    expect(usedSheet.leftoverRegions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          x: 1480,
          y: 0,
          width: 20,
          height: 1250,
        }),
        expect.objectContaining({
          x: 0,
          y: 1730,
          width: 1500,
          height: 90,
        }),
      ])
    );
  });

  it("prefers a fulfilled one-source plan over a fulfilled multi-source alternative", () => {
    const sources: GlassPiece[] = [
      {
        id: "single-sheet",
        code: "single-sheet",
        width: 1000,
        height: 1000,
        thickness: 8,
        glass_type: "clear",
        status: "available",
        rack: "A",
        rack_order: 1,
        parent_piece_id: null,
        reserved_order_id: null,
      },
      {
        id: "split-a",
        code: "split-a",
        width: 600,
        height: 1000,
        thickness: 8,
        glass_type: "clear",
        status: "available",
        rack: "A",
        rack_order: 2,
        parent_piece_id: null,
        reserved_order_id: null,
      },
      {
        id: "split-b",
        code: "split-b",
        width: 600,
        height: 1000,
        thickness: 8,
        glass_type: "clear",
        status: "available",
        rack: "A",
        rack_order: 3,
        parent_piece_id: null,
        reserved_order_id: null,
      },
    ];

    const orderItems: CutPlanOrderItem[] = [
      {
        id: "left-panel",
        width: 500,
        height: 1000,
        quantity: 1,
        thickness: 8,
        glass_type: "clear",
        allow_rotation: false,
      },
      {
        id: "right-panel",
        width: 500,
        height: 1000,
        quantity: 1,
        thickness: 8,
        glass_type: "clear",
        allow_rotation: false,
      },
    ];

    const [bestPlan] = generateCutPlans(orderItems, sources);

    expect(bestPlan.fulfilled).toBe(true);
    expect(bestPlan.usedSourceCount).toBe(1);
    expect(bestPlan.sources).toHaveLength(1);
    expect(bestPlan.sources[0].sourcePiece.id).toBe("single-sheet");
  });

  it("prefers the smaller adequate source sheet when both fulfill the same cuts", () => {
    const sources: GlassPiece[] = [
      {
        id: "sheet-1500x1820",
        code: "S-1500x1820",
        width: 1500,
        height: 1820,
        thickness: 6,
        glass_type: "Clear",
        status: "available",
        rack: "A",
        rack_order: 1,
        parent_piece_id: null,
        reserved_order_id: null,
      },
      {
        id: "sheet-2440x1830",
        code: "S-2440x1830",
        width: 2440,
        height: 1830,
        thickness: 6,
        glass_type: "Clear",
        status: "available",
        rack: "A",
        rack_order: 2,
        parent_piece_id: null,
        reserved_order_id: null,
      },
    ];

    const orderItems: CutPlanOrderItem[] = [
      {
        id: "item-a",
        width: 1250,
        height: 1480,
        quantity: 1,
        thickness: 6,
        glass_type: "Clear",
        allow_rotation: true,
      },
      {
        id: "item-b",
        width: 480,
        height: 1500,
        quantity: 1,
        thickness: 6,
        glass_type: "Clear",
        allow_rotation: true,
      },
    ];

    const [bestPlan] = generateCutPlans(orderItems, sources);

    expect(bestPlan.fulfilled).toBe(true);
    expect(bestPlan.usedSourceCount).toBe(1);
    expect(bestPlan.sources).toHaveLength(1);
    expect(bestPlan.sources[0].sourcePiece.id).toBe("sheet-1500x1820");
    expect(bestPlan.sources[0].sourcePiece.width).toBe(1500);
    expect(bestPlan.sources[0].sourcePiece.height).toBe(1820);
  });

  it("classifies a 100×100 offcut as waste instead of useful leftover", () => {
    const sourceSheet: GlassPiece = {
      id: "sheet-2440x1830",
      code: "S-2440x1830",
      width: 2440,
      height: 1830,
      thickness: 6,
      glass_type: "clear",
      status: "available",
      rack: "A",
      rack_order: 1,
      parent_piece_id: null,
      reserved_order_id: null,
    };
    const orderItems: CutPlanOrderItem[] = [
      { id: "big", width: 1250, height: 1480, quantity: 1, thickness: 6, glass_type: "clear", allow_rotation: true },
      { id: "small", width: 100, height: 100, quantity: 1, thickness: 6, glass_type: "clear", allow_rotation: true },
    ];

    const [bestPlan] = generateCutPlans(orderItems, [sourceSheet]);
    expect(bestPlan.fulfilled).toBe(true);
    const [usedSheet] = bestPlan.sources;
    expect(usedSheet.wasteRegions).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 100, height: 100, kind: "waste" })])
    );
    expect(usedSheet.leftoverRegions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 100, height: 100, kind: "leftover" })])
    );
  });

  it("keeps large offcuts above threshold as useful leftovers", () => {
    const sourceSheet: GlassPiece = {
      id: "sheet-2440x1830",
      code: "S-2440x1830",
      width: 2440,
      height: 1830,
      thickness: 6,
      glass_type: "clear",
      status: "available",
      rack: "A",
      rack_order: 1,
      parent_piece_id: null,
      reserved_order_id: null,
    };
    const orderItems: CutPlanOrderItem[] = [
      { id: "big", width: 1250, height: 1480, quantity: 1, thickness: 6, glass_type: "clear", allow_rotation: true },
    ];

    const [bestPlan] = generateCutPlans(orderItems, [sourceSheet]);
    const [usedSheet] = bestPlan.sources;
    expect(usedSheet.leftoverRegions).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 1190, height: 1830, kind: "leftover" })])
    );
  });

  it("prefers a lower total-area split plan for four 700×1440 pieces", () => {
    const sources: GlassPiece[] = [
      {
        id: "sheet-1500x2100",
        code: "S-1500x2100",
        width: 1500,
        height: 2100,
        thickness: 6,
        glass_type: "clear",
        status: "available",
        rack: "A",
        rack_order: 1,
        parent_piece_id: null,
        reserved_order_id: null,
      },
      {
        id: "sheet-1500x1830",
        code: "S-1500x1830",
        width: 1500,
        height: 1830,
        thickness: 6,
        glass_type: "clear",
        status: "available",
        rack: "A",
        rack_order: 2,
        parent_piece_id: null,
        reserved_order_id: null,
      },
      {
        id: "sheet-2440x1830",
        code: "S-2440x1830",
        width: 2440,
        height: 1830,
        thickness: 6,
        glass_type: "clear",
        status: "available",
        rack: "A",
        rack_order: 3,
        parent_piece_id: null,
        reserved_order_id: null,
      },
    ];
    const orderItems: CutPlanOrderItem[] = [
      { id: "panel", width: 700, height: 1440, quantity: 4, thickness: 6, glass_type: "clear", allow_rotation: true },
    ];

    const [bestPlan] = generateCutPlans(orderItems, sources);
    expect(bestPlan.fulfilled).toBe(true);
    expect(bestPlan.usedSourceCount).toBe(2);
    expect(bestPlan.sources.map((source) => source.sourcePiece.id).sort()).toEqual(["sheet-1500x1830", "sheet-1500x2100"]);

    const source2100 = bestPlan.sources.find((source) => source.sourcePiece.id === "sheet-1500x2100");
    expect(source2100).toBeDefined();
    expect(source2100?.placedCuts).toHaveLength(3);
    expect(source2100?.placedCuts.every((cut) => cut.width === 1440 && cut.height === 700 && cut.rotated)).toBe(true);

    const totalSourceArea = bestPlan.sources.reduce(
      (sum, source) => sum + source.sourcePiece.width * source.sourcePiece.height,
      0
    );
    expect(totalSourceArea).toBe(1500 * 2100 + 1500 * 1830);
  });
});
