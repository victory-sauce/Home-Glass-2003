import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useMemo,
  useState,
} from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FilePlus2, GlassWater, Printer, Save } from "lucide-react";
import { QuoteItemCard } from "./QuoteItemCard";
import { SAMPLE_QUOTATION } from "./sampleData";
import type {
  DoorConfig,
  DoorMotion,
  FoldingDoorConfig,
  QuoteItemKind,
  QuoteItem,
  Quotation,
  TrackCount,
} from "./types";

const SIGN_OFF_EN =
  "The customer confirms that all product dimensions, opening direction, glass type, frame color, hardware, quantity, and installation location shown in this quotation are correct and approved for production.";

const SIGN_OFF_TH =
  "ลูกค้าได้ตรวจสอบและยืนยันขนาดสินค้า ทิศทางการเปิด-ปิด ประเภทกระจก สีกรอบ อุปกรณ์ จำนวนชุด และตำแหน่งติดตั้ง ตามแบบและใบเสนอราคานี้ถูกต้องแล้ว และอนุมัติให้ดำเนินการผลิตได้";

const TRACK_OPTIONS: TrackCount[] = [1, 2, 3, 4];
const DOOR_MOTION_OPTIONS: Array<{ value: DoorMotion; label: string }> = [
  { value: "fixed", label: "Fixed" },
  { value: "slidesLeft", label: "Slides left" },
  { value: "slidesRight", label: "Slides right" },
];
const COMPACT_INPUT_CLASS = "h-8 px-2 text-sm";
const COMPACT_SELECT_CLASS =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-sm";
const DEFAULT_SLIDING_HARDWARE = "Custom track door system";
const DEFAULT_FOLDING_HARDWARE = "Custom folding door system";
const MAX_SLIDING_DOORS = 12;
const MAX_FOLDING_DOORS = 32;

type DoorBuilderState = {
  itemKind: QuoteItemKind;
  quantity: number;
  widthMm: number;
  heightMm: number;
  floorLevelMm: string;
  trackCount: TrackCount;
  doorCount: number;
  doors: DoorConfig[];
  foldingLeftCount: number;
  foldingRightCount: number;
  foldingHandleDoorNumbers: number[];
  aluminumColor: string;
  glassType: string;
  hardware: string;
  lockPosition: "left" | "right";
  viewDirection: "inside" | "outside";
};

const DEFAULT_DOOR_BUILDER: DoorBuilderState = {
  itemKind: "sliding",
  quantity: 1,
  widthMm: 3715,
  heightMm: 2795,
  floorLevelMm: "",
  trackCount: 2,
  doorCount: 2,
  doors: [
    { id: "door-1", track: 1, motion: "fixed" },
    { id: "door-2", track: 2, motion: "slidesLeft" },
  ],
  foldingLeftCount: 0,
  foldingRightCount: 2,
  foldingHandleDoorNumbers: [],
  aluminumColor: "White",
  glassType: "Clear tempered glass",
  hardware: DEFAULT_SLIDING_HARDWARE,
  lockPosition: "right",
  viewDirection: "inside",
};

export function QuotationPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([SAMPLE_QUOTATION]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(SAMPLE_QUOTATION.id);
  const [doorBuilder, setDoorBuilder] = useState<DoorBuilderState>(DEFAULT_DOOR_BUILDER);

  const selectedQuotation = useMemo(
    () => quotations.find((quotation) => quotation.id === selectedQuoteId),
    [quotations, selectedQuoteId]
  );

  const createQuotation = () => {
    const nextNumber = quotations.length + 1;
    const newQuotation: Quotation = {
      id: `q-${Date.now()}`,
      quoteNumber: `QT-2026-${String(nextNumber).padStart(4, "0")}`,
      customerName: "",
      customerPhone: "",
      projectName: "",
      location: "",
      status: "draft",
      notes: "",
      quoteDate: new Date().toISOString().slice(0, 10),
      items: [],
    };

    setQuotations((previous) => [newQuotation, ...previous]);
    setSelectedQuoteId(newQuotation.id);
  };

  const updateSelectedQuotation = (patch: Partial<Quotation>) => {
    if (!selectedQuotation) return;

    setQuotations((previous) =>
      previous.map((quotation) =>
        quotation.id === selectedQuotation.id
          ? {
              ...quotation,
              ...patch,
            }
          : quotation
      )
    );
  };

  const addDoorSystemToQuotation = () => {
    if (!selectedQuotation) return;

    const itemIndex = selectedQuotation.items.length + 1;
    const floorLevelMm =
      doorBuilder.floorLevelMm.trim() === ""
        ? undefined
        : Number(doorBuilder.floorLevelMm);

    let itemToAdd: QuoteItem;

    if (doorBuilder.itemKind === "folding") {
      const folding = normalizeFoldingConfig(doorBuilder);

      if (folding.leftPanels + folding.rightPanels !== folding.totalPanels) {
        return;
      }

      itemToAdd = {
        id: `item-${Date.now()}`,
        itemCode: `FOLD-${String(itemIndex).padStart(2, "0")}`,
        itemKind: "folding",
        drawingId: "custom-folding-door-system",
        productName: buildFoldingDoorSystemName(folding),
        quantity: Math.max(doorBuilder.quantity, 1),
        widthMm: Math.max(doorBuilder.widthMm, 1),
        heightMm: Math.max(doorBuilder.heightMm, 1),
        floorLevelMm: Number.isFinite(floorLevelMm) ? floorLevelMm : undefined,
        panelCount: folding.totalPanels,
        trackCount: 1,
        folding,
        aluminumColor: doorBuilder.aluminumColor,
        glassType: doorBuilder.glassType,
        hardware:
          doorBuilder.hardware.trim() && doorBuilder.hardware !== DEFAULT_SLIDING_HARDWARE
            ? doorBuilder.hardware
            : buildFoldingHardwareSummary(folding),
        showLock: false,
        showOutInMarker: true,
        lockPosition: doorBuilder.lockPosition,
        viewDirection: doorBuilder.viewDirection,
      };
    } else {
      const normalizedDoors = normalizeBuilderDoors(
        doorBuilder.doors,
        doorBuilder.doorCount,
        doorBuilder.trackCount
      );

      itemToAdd = {
        id: `item-${Date.now()}`,
        itemCode: `CUSTOM-${String(itemIndex).padStart(2, "0")}`,
        itemKind: "sliding",
        drawingId: "custom-door-system",
        productName: buildSlidingDoorSystemName(doorBuilder.doorCount, doorBuilder.trackCount),
        quantity: Math.max(doorBuilder.quantity, 1),
        widthMm: Math.max(doorBuilder.widthMm, 1),
        heightMm: Math.max(doorBuilder.heightMm, 1),
        floorLevelMm: Number.isFinite(floorLevelMm) ? floorLevelMm : undefined,
        panelCount: doorBuilder.doorCount,
        trackCount: doorBuilder.trackCount,
        doors: normalizedDoors,
        aluminumColor: doorBuilder.aluminumColor,
        glassType: doorBuilder.glassType,
        hardware: doorBuilder.hardware.trim() || buildSlidingHardwareSummary(normalizedDoors),
        showLock: false,
        showOutInMarker: true,
        lockPosition: doorBuilder.lockPosition,
        viewDirection: doorBuilder.viewDirection,
      };
    }

    updateSelectedQuotation({
      items: [...selectedQuotation.items, itemToAdd],
    });
  };

  const updateQuoteItem = (itemId: string, patch: Partial<QuoteItem>) => {
    setQuotations((previous) =>
      previous.map((quotation) =>
        quotation.id === selectedQuoteId
          ? {
              ...quotation,
              items: quotation.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      ...patch,
                    }
                  : item
              ),
            }
          : quotation
      )
    );
  };

  const deleteQuoteItem = (itemId: string) => {
    setQuotations((previous) =>
      previous.map((quotation) =>
        quotation.id === selectedQuoteId
          ? {
              ...quotation,
              items: quotation.items.filter((item) => item.id !== itemId),
            }
          : quotation
      )
    );
  };

  const printPreview = () => {
    window.open("/quotations/print", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="screen-only min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <GlassWater className="h-8 w-8 text-primary-foreground" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Home Glass 2003
                </h1>
                <p className="text-muted-foreground">
                  Quotations module · SVG technical preview
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={printPreview}>
                <Printer className="mr-2 h-4 w-4" />
                Print / PDF preview
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                Quotation list
                <Button size="sm" onClick={createQuotation}>
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Create New Quotation
                </Button>
              </CardTitle>
              <CardDescription>
                Select a quote to edit and preview before saving to Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quotations.map((quotation) => (
                <button
                  type="button"
                  key={quotation.id}
                  onClick={() => setSelectedQuoteId(quotation.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selectedQuoteId === quotation.id
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">
                      {quotation.quoteNumber}
                    </div>
                    <Badge variant="outline">{quotation.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {quotation.customerName || "No customer yet"}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedQuotation && (
            <Card>
              <CardHeader>
                <CardTitle>Quotation form</CardTitle>
                <CardDescription>
                  Header information for customer and project.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <FormField label="Quote number">
                  <Input
                    value={selectedQuotation.quoteNumber}
                    onChange={(event) =>
                      updateSelectedQuotation({ quoteNumber: event.target.value })
                    }
                  />
                </FormField>

                <FormField label="Quote date">
                  <Input
                    type="date"
                    value={selectedQuotation.quoteDate}
                    onChange={(event) =>
                      updateSelectedQuotation({ quoteDate: event.target.value })
                    }
                  />
                </FormField>

                <FormField label="Customer name">
                  <Input
                    value={selectedQuotation.customerName}
                    onChange={(event) =>
                      updateSelectedQuotation({ customerName: event.target.value })
                    }
                  />
                </FormField>

                <FormField label="Phone">
                  <Input
                    value={selectedQuotation.customerPhone}
                    onChange={(event) =>
                      updateSelectedQuotation({ customerPhone: event.target.value })
                    }
                  />
                </FormField>

                <FormField label="Project name">
                  <Input
                    value={selectedQuotation.projectName}
                    onChange={(event) =>
                      updateSelectedQuotation({ projectName: event.target.value })
                    }
                  />
                </FormField>

                <FormField label="Location">
                  <Input
                    value={selectedQuotation.location}
                    onChange={(event) =>
                      updateSelectedQuotation({ location: event.target.value })
                    }
                  />
                </FormField>

                <FormField label="Notes">
                  <Textarea
                    value={selectedQuotation.notes ?? ""}
                    onChange={(event) =>
                      updateSelectedQuotation({ notes: event.target.value })
                    }
                    className="min-h-20"
                  />
                </FormField>
              </CardContent>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quotation preview</CardTitle>
              <CardDescription>
                Build door systems here, then review the generated SVG quote items below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedQuotation ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-lg font-bold text-slate-900">
                          Home Glass 2003
                        </div>
                        <div className="text-sm text-slate-600">
                          Quotation #{selectedQuotation.quoteNumber}
                        </div>
                        <div className="text-sm text-slate-600">
                          Date: {selectedQuotation.quoteDate}
                        </div>
                      </div>

                      <div className="text-sm text-slate-700">
                        <div>
                          <span className="font-semibold">Customer:</span>{" "}
                          {selectedQuotation.customerName || "-"}
                        </div>
                        <div>
                          <span className="font-semibold">Phone:</span>{" "}
                          {selectedQuotation.customerPhone || "-"}
                        </div>
                        <div>
                          <span className="font-semibold">Project:</span>{" "}
                          {selectedQuotation.projectName || "-"}
                        </div>
                        <div>
                          <span className="font-semibold">Location:</span>{" "}
                          {selectedQuotation.location || "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <DoorSystemBuilderPanel
                    builder={doorBuilder}
                    setBuilder={setDoorBuilder}
                    onAddItem={addDoorSystemToQuotation}
                  />

                  {selectedQuotation.items.map((item) => (
                    <QuoteItemCard
                      key={item.id}
                      item={item}
                      onUpdateItem={updateQuoteItem}
                      onDeleteItem={deleteQuoteItem}
                    />
                  ))}

                  <Card className="border-dashed border-slate-300">
                    <CardHeader>
                      <CardTitle className="text-base">Customer sign-off</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-700">
                      <p>{SIGN_OFF_EN}</p>
                      <p>{SIGN_OFF_TH}</p>

                      <div className="grid gap-4 pt-4 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 p-3">
                          <div className="text-xs text-slate-500">Customer signature</div>
                          <div className="mt-8 border-b border-slate-300" />
                        </div>
                        <div className="rounded-lg border border-slate-200 p-3">
                          <div className="text-xs text-slate-500">Date</div>
                          <div className="mt-8 border-b border-slate-300" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-muted-foreground">
                  Select or create a quotation to start.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function DoorSystemBuilderPanel({
  builder,
  setBuilder,
  onAddItem,
}: {
  builder: DoorBuilderState;
  setBuilder: Dispatch<SetStateAction<DoorBuilderState>>;
  onAddItem: () => void;
}) {
  const trackOptions = TRACK_OPTIONS.filter((track) => track <= builder.trackCount);
  const isFolding = builder.itemKind === "folding";
  const foldingConfig = normalizeFoldingConfig(builder);
  const foldingSplitIsValid =
    foldingConfig.leftPanels + foldingConfig.rightPanels === foldingConfig.totalPanels;

  const updateItemKind = (itemKind: QuoteItemKind) => {
    setBuilder((previous) => {
      const switchingToFolding = itemKind === "folding";
      const wasDefaultSlidingHardware = previous.hardware === DEFAULT_SLIDING_HARDWARE;
      const wasDefaultFoldingHardware = previous.hardware === DEFAULT_FOLDING_HARDWARE;
      const nextDoorCount = switchingToFolding
        ? Math.min(Math.max(previous.doorCount, 2), MAX_FOLDING_DOORS)
        : Math.min(Math.max(previous.doorCount, 1), MAX_SLIDING_DOORS);

      return {
        ...previous,
        itemKind,
        doorCount: nextDoorCount,
        doors: normalizeBuilderDoors(previous.doors, nextDoorCount, previous.trackCount),
        foldingLeftCount: Math.min(previous.foldingLeftCount, nextDoorCount),
        foldingRightCount:
          previous.foldingLeftCount + previous.foldingRightCount === previous.doorCount
            ? Math.max(nextDoorCount - previous.foldingLeftCount, 0)
            : Math.min(previous.foldingRightCount, nextDoorCount),
        foldingHandleDoorNumbers: previous.foldingHandleDoorNumbers.filter(
          (doorNumber) => doorNumber <= nextDoorCount
        ),
        hardware:
          switchingToFolding && wasDefaultSlidingHardware
            ? DEFAULT_FOLDING_HARDWARE
            : !switchingToFolding && wasDefaultFoldingHardware
              ? DEFAULT_SLIDING_HARDWARE
              : previous.hardware,
      };
    });
  };

  const updateTrackCount = (trackCount: TrackCount) => {
    setBuilder((previous) => ({
      ...previous,
      trackCount,
      doors: normalizeBuilderDoors(previous.doors, previous.doorCount, trackCount),
    }));
  };

  const updateDoorCount = (doorCount: number) => {
    setBuilder((previous) => ({
      ...previous,
      ...getBuilderDoorCountPatch(previous, doorCount),
    }));
  };

  const updateFoldingLeftCount = (leftCount: number) => {
    setBuilder((previous) => ({
      ...previous,
      foldingLeftCount: clampNumber(
        Math.round(leftCount) || 0,
        0,
        getSafeDoorCount(previous.doorCount, MAX_FOLDING_DOORS)
      ),
    }));
  };

  const updateFoldingRightCount = (rightCount: number) => {
    setBuilder((previous) => ({
      ...previous,
      foldingRightCount: clampNumber(
        Math.round(rightCount) || 0,
        0,
        getSafeDoorCount(previous.doorCount, MAX_FOLDING_DOORS)
      ),
    }));
  };

  const toggleFoldingHandleDoor = (doorNumber: number) => {
    setBuilder((previous) => {
      const hasDoorNumber = previous.foldingHandleDoorNumbers.includes(doorNumber);

      return {
        ...previous,
        foldingHandleDoorNumbers: hasDoorNumber
          ? previous.foldingHandleDoorNumbers.filter((number) => number !== doorNumber)
          : [...previous.foldingHandleDoorNumbers, doorNumber].sort((a, b) => a - b),
      };
    });
  };

  const updateDoor = (index: number, patch: Partial<DoorConfig>) => {
    setBuilder((previous) => ({
      ...previous,
      doors: previous.doors.map((door, doorIndex) =>
        doorIndex === index
          ? {
              ...door,
              ...patch,
            }
          : door
      ),
    }));
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Add Quote Item</h2>
          <p className="text-xs text-slate-600">Choose sliding or folding, then build the door set.</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {isFolding
            ? `${foldingConfig.totalPanels} doors · ${foldingConfig.leftPanels}L${foldingConfig.rightPanels}R`
            : `${builder.trackCount} track${builder.trackCount > 1 ? "s" : ""} · ${builder.doorCount} door${builder.doorCount > 1 ? "s" : ""}`}
        </Badge>
      </div>

      <div className="mb-3">
        <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Door system
        </Label>
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
          {(["sliding", "folding"] as QuoteItemKind[]).map((itemKind) => (
            <button
              key={itemKind}
              type="button"
              onClick={() => updateItemKind(itemKind)}
              className={`rounded px-4 py-1.5 text-sm font-semibold transition ${
                builder.itemKind === itemKind
                  ? "bg-slate-950 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              {itemKind === "sliding" ? "Sliding" : "Folding"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-7">
        <CompactField label="Qty">
          <Input
            type="number"
            min={1}
            value={builder.quantity}
            className={COMPACT_INPUT_CLASS}
            onChange={(event) =>
              setBuilder((previous) => ({
                ...previous,
                quantity: Number(event.target.value) || 1,
              }))
            }
          />
        </CompactField>

        <CompactField label="Width (mm)">
          <Input
            type="number"
            min={1}
            value={builder.widthMm}
            className={COMPACT_INPUT_CLASS}
            onChange={(event) =>
              setBuilder((previous) => ({
                ...previous,
                widthMm: Number(event.target.value) || 1,
              }))
            }
          />
        </CompactField>

        <CompactField label="Height (mm)">
          <Input
            type="number"
            min={1}
            value={builder.heightMm}
            className={COMPACT_INPUT_CLASS}
            onChange={(event) =>
              setBuilder((previous) => ({
                ...previous,
                heightMm: Number(event.target.value) || 1,
              }))
            }
          />
        </CompactField>

        <CompactField label="Floor (mm)">
          <Input
            type="number"
            value={builder.floorLevelMm}
            className={COMPACT_INPUT_CLASS}
            onChange={(event) =>
              setBuilder((previous) => ({
                ...previous,
                floorLevelMm: event.target.value,
              }))
            }
          />
        </CompactField>

        {isFolding ? (
          <>
            <CompactField label="Total doors">
              <Input
                type="number"
                min={1}
                max={MAX_FOLDING_DOORS}
                value={builder.doorCount}
                className={COMPACT_INPUT_CLASS}
                onChange={(event) => updateDoorCount(Number(event.target.value))}
              />
            </CompactField>

            <CompactField label="Fold left">
              <Input
                type="number"
                min={0}
                max={builder.doorCount}
                value={builder.foldingLeftCount}
                className={COMPACT_INPUT_CLASS}
                onChange={(event) => updateFoldingLeftCount(Number(event.target.value))}
              />
            </CompactField>

            <CompactField label="Fold right">
              <Input
                type="number"
                min={0}
                max={builder.doorCount}
                value={builder.foldingRightCount}
                className={COMPACT_INPUT_CLASS}
                onChange={(event) => updateFoldingRightCount(Number(event.target.value))}
              />
            </CompactField>
          </>
        ) : (
          <>
            <CompactField label="Tracks">
              <select
                value={builder.trackCount}
                onChange={(event) => updateTrackCount(Number(event.target.value) as TrackCount)}
                className={COMPACT_SELECT_CLASS}
              >
                {TRACK_OPTIONS.map((track) => (
                  <option key={track} value={track}>
                    {track} track{track > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </CompactField>

            <CompactField label="Doors">
              <Input
                type="number"
                min={1}
                max={MAX_SLIDING_DOORS}
                value={builder.doorCount}
                className={COMPACT_INPUT_CLASS}
                onChange={(event) => updateDoorCount(Number(event.target.value))}
              />
            </CompactField>
          </>
        )}
      </div>

      {isFolding ? (
        <div className="mt-3 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Optional handles
            </div>
            {!foldingSplitIsValid && (
              <div className="text-xs font-semibold text-red-600">
                Left + right must equal total doors.
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: foldingConfig.totalPanels }).map((_, index) => {
              const doorNumber = index + 1;
              const checked = builder.foldingHandleDoorNumbers.includes(doorNumber);

              return (
                <label
                  key={`folding-handle-${doorNumber}`}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-semibold ${
                    checked
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleFoldingHandleDoor(doorNumber)}
                    className="sr-only"
                  />
                  Door {doorNumber}
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[72px_1fr_1fr] gap-2 bg-slate-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Door</div>
            <div>Track</div>
            <div>Type</div>
          </div>
          {builder.doors.slice(0, builder.doorCount).map((door, index) => (
            <div
              key={door.id}
              className="grid grid-cols-[72px_1fr_1fr] items-center gap-2 border-t border-slate-200 px-3 py-2"
            >
              <div className="text-sm font-semibold text-slate-800">Door {index + 1}</div>

              <select
                value={Math.min(door.track, builder.trackCount)}
                onChange={(event) =>
                  updateDoor(index, {
                    track: Number(event.target.value) as TrackCount,
                  })
                }
                className={COMPACT_SELECT_CLASS}
              >
                {trackOptions.map((track) => (
                  <option key={track} value={track}>
                    Track {track}
                  </option>
                ))}
              </select>

              <select
                value={door.motion}
                onChange={(event) =>
                  updateDoor(index, {
                    motion: event.target.value as DoorMotion,
                  })
                }
                className={COMPACT_SELECT_CLASS}
              >
                {DOOR_MOTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-800">
          Finish, glass, hardware, lock, view
        </summary>
        <div className="grid gap-2 border-t border-slate-200 bg-white p-3 md:grid-cols-2">
          <CompactField label="Aluminum color">
            <Input
              value={builder.aluminumColor}
              className={COMPACT_INPUT_CLASS}
              onChange={(event) =>
                setBuilder((previous) => ({
                  ...previous,
                  aluminumColor: event.target.value,
                }))
              }
            />
          </CompactField>

          <CompactField label="Glass type">
            <Input
              value={builder.glassType}
              className={COMPACT_INPUT_CLASS}
              onChange={(event) =>
                setBuilder((previous) => ({
                  ...previous,
                  glassType: event.target.value,
                }))
              }
            />
          </CompactField>

          <div className="md:col-span-2">
            <CompactField label="Hardware">
              <Input
                value={builder.hardware}
                className={COMPACT_INPUT_CLASS}
                onChange={(event) =>
                  setBuilder((previous) => ({
                    ...previous,
                    hardware: event.target.value,
                  }))
                }
              />
            </CompactField>
          </div>

          <CompactField label="Lock position">
            <select
              value={builder.lockPosition}
              onChange={(event) =>
                setBuilder((previous) => ({
                  ...previous,
                  lockPosition: event.target.value as "left" | "right",
                }))
              }
              className={COMPACT_SELECT_CLASS}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </CompactField>

          <CompactField label="View direction">
            <select
              value={builder.viewDirection}
              onChange={(event) =>
                setBuilder((previous) => ({
                  ...previous,
                  viewDirection: event.target.value as "inside" | "outside",
                }))
              }
              className={COMPACT_SELECT_CLASS}
            >
              <option value="inside">Inside</option>
              <option value="outside">Outside</option>
            </select>
          </CompactField>
        </div>
      </details>

      <Button
        className="mt-3 h-9 w-full"
        onClick={onAddItem}
        disabled={isFolding && !foldingSplitIsValid}
      >
        <Save className="mr-2 h-4 w-4" />
        Add Quote Item
      </Button>
    </div>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function normalizeBuilderDoors(
  doors: DoorConfig[],
  doorCount: number,
  trackCount: TrackCount
): DoorConfig[] {
  return Array.from({ length: doorCount }).map((_, index) => {
    const door = doors[index];

    return {
      id: door?.id ?? `door-${index + 1}`,
      track: clampTrack(door?.track ?? 1, trackCount),
      motion: door?.motion ?? "fixed",
    };
  });
}

function getBuilderDoorCountPatch(
  previous: DoorBuilderState,
  doorCount: number
): Pick<
  DoorBuilderState,
  | "doorCount"
  | "doors"
  | "foldingLeftCount"
  | "foldingRightCount"
  | "foldingHandleDoorNumbers"
> {
  const maxDoorCount =
    previous.itemKind === "folding" ? MAX_FOLDING_DOORS : MAX_SLIDING_DOORS;
  const safeDoorCount = getSafeDoorCount(doorCount, maxDoorCount);
  const previousFoldingWasBalanced =
    previous.foldingLeftCount + previous.foldingRightCount === previous.doorCount;
  const foldingLeftCount = Math.min(previous.foldingLeftCount, safeDoorCount);
  const foldingRightCount = previousFoldingWasBalanced
    ? Math.max(safeDoorCount - foldingLeftCount, 0)
    : Math.min(previous.foldingRightCount, safeDoorCount);

  return {
    doorCount: safeDoorCount,
    doors: normalizeBuilderDoors(previous.doors, safeDoorCount, previous.trackCount),
    foldingLeftCount,
    foldingRightCount,
    foldingHandleDoorNumbers: previous.foldingHandleDoorNumbers.filter(
      (doorNumber) => doorNumber <= safeDoorCount
    ),
  };
}

function clampTrack(track: TrackCount, trackCount: TrackCount): TrackCount {
  return Math.min(Math.max(track, 1), trackCount) as TrackCount;
}

function getSafeDoorCount(doorCount: number, maxDoorCount: number) {
  return clampNumber(Math.round(doorCount) || 1, 1, maxDoorCount);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeFoldingConfig(builder: DoorBuilderState): FoldingDoorConfig {
  const totalPanels = getSafeDoorCount(builder.doorCount, MAX_FOLDING_DOORS);
  const leftPanels = clampNumber(Math.round(builder.foldingLeftCount) || 0, 0, totalPanels);
  const rightPanels = clampNumber(
    Math.round(builder.foldingRightCount) || 0,
    0,
    totalPanels
  );

  return {
    totalPanels,
    leftPanels,
    rightPanels,
    handleDoorNumbers: builder.foldingHandleDoorNumbers.filter(
      (doorNumber) => doorNumber >= 1 && doorNumber <= totalPanels
    ),
  };
}

function buildSlidingDoorSystemName(doorCount: number, trackCount: TrackCount) {
  return `${doorCount}-door ${trackCount}-track door system`;
}

function buildFoldingDoorSystemName(folding: FoldingDoorConfig) {
  return `${folding.totalPanels}-door folding system (${folding.leftPanels}L${folding.rightPanels}R)`;
}

function buildSlidingHardwareSummary(doors: DoorConfig[]) {
  const fixedCount = doors.filter((door) => door.motion === "fixed").length;
  const slidingCount = doors.length - fixedCount;

  return `${fixedCount} fixed door${fixedCount === 1 ? "" : "s"} plus ${slidingCount} sliding door${slidingCount === 1 ? "" : "s"}`;
}

function buildFoldingHardwareSummary(folding: FoldingDoorConfig) {
  const handleSummary =
    folding.handleDoorNumbers.length > 0
      ? ` with handles on door ${folding.handleDoorNumbers.join(", ")}`
      : "";

  return `${folding.totalPanels} folding leaves opening ${folding.leftPanels} left / ${folding.rightPanels} right${handleSummary}`;
}
