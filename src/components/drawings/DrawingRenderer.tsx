import { FourPanelSlidingDoorDrawing } from "./FourPanelSlidingDoorDrawing";
import { SlidingDoorDrawing } from "./SlidingDoorDrawing";
import type { DrawingId } from "@/components/quotations/types";

type DrawingRendererProps = {
  drawingId?: DrawingId;
  widthMm: number;
  heightMm: number;
  floorLevelMm?: number;
  panelCount: number;
  quantity: number;
  showLock: boolean;
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
  panelCount,
  quantity,
  showLock,
  lockPosition,
  viewDirection,
  itemCode,
  productName,
  className,
  printMode = false,
}: DrawingRendererProps) {
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

  return (
    <SlidingDoorDrawing
      widthMm={widthMm}
      heightMm={heightMm}
      floorLevelMm={floorLevelMm}
      panelCount={panelCount}
      quantity={quantity}
      showTopView={!printMode}
      showLock={showLock}
      lockPosition={lockPosition}
      viewDirection={viewDirection}
      itemCode={itemCode}
      productName={productName}
      className={className}
    />
  );
}
