import { describe, expect, it } from "vitest";

import {
  packItemsOnSources,
  shelfGuillotinePrototypeEngine,
  type PackingAdapterItem,
  type PackingAdapterSource,
} from "@/lib/packingAdapter";

describe("packingAdapter prototype", () => {
  it("fits 1250×1480 and 480×1500 on one 1500×1820 source when rotation is allowed", () => {
    const items: PackingAdapterItem[] = [
      { id: "item-a", width: 1250, height: 1480, allowRotation: true },
      { id: "item-b", width: 480, height: 1500, allowRotation: true },
    ];

    const sources: PackingAdapterSource[] = [
      { id: "sheet-1500x1820", width: 1500, height: 1820, rack: "A", rackOrder: 1 },
    ];

    const packed = packItemsOnSources(items, sources, shelfGuillotinePrototypeEngine);

    expect(packed.best).toBeDefined();
    expect(packed.best?.result.unplacedItemIds).toHaveLength(0);
    expect(packed.best?.result.placements).toHaveLength(2);
    expect(packed.best?.source.id).toBe("sheet-1500x1820");
  });

  it("chooses 1500×1820 over 2440×1830 when both fulfill all items", () => {
    const items: PackingAdapterItem[] = [
      { id: "item-a", width: 1250, height: 1480, allowRotation: true },
      { id: "item-b", width: 480, height: 1500, allowRotation: true },
    ];

    const sources: PackingAdapterSource[] = [
      { id: "sheet-1500x1820", width: 1500, height: 1820, rack: "A", rackOrder: 1 },
      { id: "sheet-2440x1830", width: 2440, height: 1830, rack: "A", rackOrder: 2 },
    ];

    const packed = packItemsOnSources(items, sources, shelfGuillotinePrototypeEngine);

    expect(packed.best).toBeDefined();
    expect(packed.best?.result.unplacedItemIds).toHaveLength(0);
    expect(packed.best?.source.id).toBe("sheet-1500x1820");
  });
});
