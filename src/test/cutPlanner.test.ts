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
});
