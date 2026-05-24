import type { DrawingId, QuoteItem } from "@/components/quotations/types";

export type DrawingCatalogItem = {
  id: DrawingId;
  itemCode: string;
  productName: string;
  description: string;
  tags: string[];
  defaults: Omit<QuoteItem, "id">;
};

export const drawingCatalog: DrawingCatalogItem[] = [
  {
    id: "generic-sliding-door",
    itemCode: "D6.1",
    productName: "3-panel sliding glass door",
    description: "Generic parametric sliding door template for standard quote items.",
    tags: ["sliding", "door", "glass", "3 panel"],
    defaults: {
      itemCode: "D6.1",
      drawingId: "generic-sliding-door",
      productName: "3-panel sliding glass door",
      quantity: 1,
      widthMm: 6000,
      heightMm: 2395,
      floorLevelMm: 1000,
      panelCount: 3,
      aluminumColor: "White",
      glassType: "Clear tempered glass",
      hardware: "Lock with key",
      showLock: true,
      lockPosition: "right",
      viewDirection: "inside",
      location: "",
    },
  },
  {
    id: "four-panel-sliding-door",
    itemCode: "D6.2",
    productName: "4-panel sliding glass door",
    description: "Four-panel sliding door with top track, slide arrows, key position, and dimensions.",
    tags: ["sliding", "door", "glass", "4 panel", "key"],
    defaults: {
      itemCode: "D6.2",
      drawingId: "four-panel-sliding-door",
      productName: "4-panel sliding glass door",
      quantity: 1,
      widthMm: 3715,
      heightMm: 2795,
      panelCount: 4,
      aluminumColor: "White",
      glassType: "Clear tempered glass",
      hardware: "Lock with key",
      showLock: true,
      lockPosition: "right",
      viewDirection: "inside",
      location: "",
    },
  },
];
