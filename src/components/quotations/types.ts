export type QuoteItem = {
  id: string;
  itemCode: string;
  productName: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  floorLevelMm?: number;
  panelCount: number;
  aluminumColor: string;
  glassType: string;
  hardware: string;
  showLock: boolean;
  lockPosition: "left" | "right";
  viewDirection: "inside" | "outside";
  location?: string;
  notes?: string;
};

export type Quotation = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerPhone: string;
  projectName: string;
  location: string;
  status: "draft" | "sent" | "approved";
  notes?: string;
  quoteDate: string;
  items: QuoteItem[];
};
