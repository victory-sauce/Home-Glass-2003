export type DrawingId =
  | "sliding-door-frame"
  | "fixed-door-module"
  | "fixed-two-door-module"
  | "behind-track-left-slide-module"
  | "behind-track-right-slide-module"
  | "four-panel-front-behind-module"
  | "custom-door-system"
  | "generic-sliding-door"
  | "four-panel-sliding-door"
  | "two-panel-sliding-door-with-post";

export type TrackCount = 1 | 2 | 3 | 4;

export type DoorMotion = "fixed" | "slidesLeft" | "slidesRight";

export type DoorConfig = {
  id: string;
  track: TrackCount;
  motion: DoorMotion;
};

export type QuoteItem = {
  id: string;
  itemCode: string;
  drawingId?: DrawingId;
  productName: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  floorLevelMm?: number;
  keyHeightMm?: number;
  panelCount: number;
  trackCount: TrackCount;
  doors?: DoorConfig[];
  aluminumColor: string;
  glassType: string;
  hardware: string;
  showLock: boolean;
  showOutInMarker?: boolean;
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
