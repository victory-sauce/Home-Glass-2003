import type { QuoteItem, Quotation } from "./types";

export const SAMPLE_ITEM: QuoteItem = {
  id: "item-d61",
  itemCode: "D6.1",
  productName: "3-panel sliding glass door",
  quantity: 2,
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
  location: "Living room",
};

export const SAMPLE_QUOTATION: Quotation = {
  id: "q-001",
  quoteNumber: "QT-2026-0001",
  customerName: "Sample Customer",
  customerPhone: "081-234-5678",
  projectName: "Home renovation phase 1",
  location: "Bangkok",
  status: "draft",
  notes: "Initial quotation preview with sliding door template.",
  quoteDate: new Date().toISOString().slice(0, 10),
  items: [SAMPLE_ITEM],
};
