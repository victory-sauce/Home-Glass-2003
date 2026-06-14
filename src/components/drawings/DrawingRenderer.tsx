import { FourPanelSlidingDoorDrawing } from "./FourPanelSlidingDoorDrawing";
import { FoldingDoorDrawing } from "./FoldingDoorDrawing";
import {
  SlidingDoorBehindTrackDrawing,
  SlidingDoorBehindTrackReverseDrawing,
  SlidingDoorCustomSystemDrawing,
  SlidingDoorFixedDoorDrawing,
  SlidingDoorFourPanelAssemblyDrawing,
  SlidingDoorFrameDrawing,
} from "./SlidingDoorFrameDrawing";
import { SlidingDoorDrawing } from "./SlidingDoorDrawing";
import { TwoPanelSlidingDoorWithPostDrawing } from "./TwoPanelSlidingDoorWithPostDrawing";
import type {
  DoorConfig,
  DrawingId,
  FoldingDoorConfig,
  TrackCount,
} from "@/components/quotations/types";

type DrawingRendererProps = {
  drawingId?: DrawingId;
  widthMm: number;
  heightMm: number;
  floorLevelMm?: number;
  keyHeightMm?: number;
  panelCount: number;
  trackCount?: TrackCount;
  doors?: DoorConfig[];
  folding?: FoldingDoorConfig;
  quantity: number;
  showTopView?: boolean;
  showLock: boolean;
  showOutInMarker?: boolean;
  lockPosition: "left" | "right";
  viewDirection: "inside" | "outside";
  itemCode: string;
  productName: string;
  className?: string;
  printMode?: boolean;
};

export function DrawingRenderer({
  drawingId,
  widthMm,
  heightMm,
  floorLevelMm,
  keyHeightMm,
  panelCount,
  trackCount = 2,
  doors,
  folding,
  quantity,
  showTopView,
  showLock,
  showOutInMarker = true,
  lockPosition,
  viewDirection,
  itemCode,
  productName,
  className,
  printMode = false,
}: DrawingRendererProps) {
  if (drawingId === "custom-folding-door-system") {
    return (
      <FoldingDoorDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        panelCount={panelCount}
        folding={folding}
        showOutInMarker={showOutInMarker}
        className={className}
      />
    );
  }

  if (drawingId === "four-panel-sliding-door") {
    return (
      <FourPanelSlidingDoorDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        quantity={quantity}
        showLock={showLock}
        lockPosition={lockPosition}
        itemCode={itemCode}
        productName={productName}
        className={className}
      />
    );
  }

  if (drawingId === "sliding-door-frame") {
    return (
      <SlidingDoorFrameDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        trackCount={trackCount}
        showOutInMarker={showOutInMarker}
        className={className}
      />
    );
  }

  if (
    drawingId === "fixed-door-module" ||
    drawingId === "fixed-two-door-module"
  ) {
    return (
      <SlidingDoorFixedDoorDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        panelCount={panelCount}
        trackCount={trackCount}
        showOutInMarker={showOutInMarker}
        className={className}
      />
    );
  }

  if (drawingId === "behind-track-left-slide-module") {
    return (
      <SlidingDoorBehindTrackDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        trackCount={trackCount}
        showOutInMarker={showOutInMarker}
        className={className}
      />
    );
  }

  if (drawingId === "behind-track-right-slide-module") {
    return (
      <SlidingDoorBehindTrackReverseDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        trackCount={trackCount}
        showOutInMarker={showOutInMarker}
        className={className}
      />
    );
  }

  if (drawingId === "four-panel-front-behind-module") {
    return (
      <SlidingDoorFourPanelAssemblyDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        trackCount={trackCount}
        showOutInMarker={showOutInMarker}
        className={className}
      />
    );
  }

  if (drawingId === "custom-door-system") {
    return (
      <SlidingDoorCustomSystemDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        panelCount={panelCount}
        trackCount={trackCount}
        doors={doors}
        showOutInMarker={showOutInMarker}
        className={className}
      />
    );
  }

  if (drawingId === "two-panel-sliding-door-with-post") {
    return (
      <TwoPanelSlidingDoorWithPostDrawing
        widthMm={widthMm}
        heightMm={heightMm}
        keyHeightMm={keyHeightMm}
        quantity={quantity}
        showLock={showLock}
        lockPosition={lockPosition}
        itemCode={itemCode}
        productName={productName}
        className={className}
      />
    );
  }

  return (
    <SlidingDoorDrawing
      widthMm={widthMm}
      heightMm={heightMm}
      floorLevelMm={floorLevelMm}
      panelCount={panelCount}
      quantity={quantity}
      showTopView={showTopView ?? !printMode}
      showLock={showLock}
      showOutInMarker={showOutInMarker}
      lockPosition={lockPosition}
      viewDirection={viewDirection}
      itemCode={itemCode}
      productName={productName}
      className={className}
    />
  );
}
