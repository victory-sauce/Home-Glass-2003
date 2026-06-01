import type { QuoteItem, Quotation } from "./types";

export const SAMPLE_ITEM: QuoteItem = {
  id: "item-behind-l-01",
  itemCode: "BEHIND-L-01",
  drawingId: "behind-track-left-slide-module",
  productName: "Behind door slides left module",
  quantity: 1,
  widthMm: 3715,
  heightMm: 2795,
  panelCount: 2,
  trackCount: 2,
  aluminumColor: "White",
  glassType: "Clear tempered glass",
  hardware: "Frame plus front and behind sliding leaves",
  showLock: false,
  lockPosition: "right",
  viewDirection: "inside",
  location: "",
};

export const SAMPLE_QUOTATION: Quotation = {
  id: "q-001",
  quoteNumber: "QT-2026-0001",
  customerName: "Sample Customer",
  customerPhone: "081-234-5678",
  projectName: "Home renovation phase 1",
  location: "Bangkok",
  status: "draft",
  notes: "Build this quotation from the product catalog.",
  quoteDate: new Date().toISOString().slice(0, 10),
  items: [],
};
