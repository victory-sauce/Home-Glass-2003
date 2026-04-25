import { type ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { SAMPLE_ITEM, SAMPLE_QUOTATION } from "./sampleData";
import type { QuoteItem, Quotation } from "./types";

const SIGN_OFF_EN =
  "The customer confirms that all product dimensions, opening direction, glass type, frame color, hardware, quantity, and installation location shown in this quotation are correct and approved for production.";

const SIGN_OFF_TH =
  "ลูกค้าได้ตรวจสอบและยืนยันขนาดสินค้า ทิศทางการเปิด-ปิด ประเภทกระจก สีกรอบ อุปกรณ์ จำนวนชุด และตำแหน่งติดตั้ง ตามแบบและใบเสนอราคานี้ถูกต้องแล้ว และอนุมัติให้ดำเนินการผลิตได้";

export function QuotationPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([SAMPLE_QUOTATION]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(SAMPLE_QUOTATION.id);
  const [newItem, setNewItem] = useState<QuoteItem>({
    ...SAMPLE_ITEM,
    id: "draft-item",
    itemCode: "D6.2",
  });

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

  const addItemToQuotation = () => {
    if (!selectedQuotation) return;

    const itemToAdd: QuoteItem = {
      ...newItem,
      id: `item-${Date.now()}`,
    };

    updateSelectedQuotation({
      items: [...selectedQuotation.items, itemToAdd],
    });
  };

  const printPreview = () => {
    window.open("/quotations/print", "_blank", "noopener,noreferrer");
  };

  return (
    <>
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
                <Button variant="outline" onClick={() => navigate("/")}>
                  Dashboard
                </Button>
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
                    <div className="font-semibold text-slate-900">{quotation.quoteNumber}</div>
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

          <Card>
            <CardHeader>
              <CardTitle>Add Quote Item</CardTitle>
              <CardDescription>
                Add one door/window set item to this quotation.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Item code">
                  <Input
                    value={newItem.itemCode}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        itemCode: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Quantity">
                  <Input
                    type="number"
                    min={1}
                    value={newItem.quantity}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        quantity: Number(event.target.value) || 1,
                      }))
                    }
                  />
                </FormField>
              </div>

              <FormField label="Product name">
                <Input
                  value={newItem.productName}
                  onChange={(event) =>
                    setNewItem((previous) => ({
                      ...previous,
                      productName: event.target.value,
                    }))
                  }
                />
              </FormField>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Width (mm)">
                  <Input
                    type="number"
                    value={newItem.widthMm}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        widthMm: Number(event.target.value) || 1,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Height (mm)">
                  <Input
                    type="number"
                    value={newItem.heightMm}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        heightMm: Number(event.target.value) || 1,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Floor level (mm)">
                  <Input
                    type="number"
                    value={newItem.floorLevelMm ?? ""}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        floorLevelMm:
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                      }))
                    }
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Aluminum color">
                  <Input
                    value={newItem.aluminumColor}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        aluminumColor: event.target.value,
                      }))
                    }
                  />
                </FormField>

                <FormField label="Glass type">
                  <Input
                    value={newItem.glassType}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        glassType: event.target.value,
                      }))
                    }
                  />
                </FormField>
              </div>

              <FormField label="Hardware">
                <Input
                  value={newItem.hardware}
                  onChange={(event) =>
                    setNewItem((previous) => ({
                      ...previous,
                      hardware: event.target.value,
                    }))
                  }
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Lock position">
                  <select
                    value={newItem.lockPosition}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        lockPosition: event.target.value as "left" | "right",
                      }))
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </FormField>

                <FormField label="View direction">
                  <select
                    value={newItem.viewDirection}
                    onChange={(event) =>
                      setNewItem((previous) => ({
                        ...previous,
                        viewDirection: event.target.value as "inside" | "outside",
                      }))
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="inside">Inside</option>
                    <option value="outside">Outside</option>
                  </select>
                </FormField>
              </div>

              <Button onClick={addItemToQuotation}>
                <Save className="mr-2 h-4 w-4" />
                Add Quote Item
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quotation preview</CardTitle>
              <CardDescription>
                Printable layout generated from quote item data using SVG.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedQuotation ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-lg font-bold text-slate-900">Home Glass 2003</div>
                        <div className="text-sm text-slate-600">Quotation #{selectedQuotation.quoteNumber}</div>
                        <div className="text-sm text-slate-600">Date: {selectedQuotation.quoteDate}</div>
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

                  {selectedQuotation.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-muted-foreground">
                      No quote items yet. Use “Add Quote Item” to build the quotation.
                    </div>
                  ) : (
                    selectedQuotation.items.map((item) => (
                      <QuoteItemCard key={item.id} item={item} />
                    ))
                  )}

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

          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Supabase wiring (next step)</CardTitle>
              <CardDescription>
                UI-first implementation complete with hardcoded sample data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                Suggested SQL tables to create later: <code>quotations</code> and{" "}
                <code>quote_items</code>.
              </p>
              <p>
                Keep frontend on anon key only. Do not expose <code>service_role</code>{" "}
                in client code.
              </p>
              <pre className="overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
{`-- Example schema (run in Supabase SQL editor when ready)
-- create table quotations (...);
-- create table quote_items (... references quotations(id) on delete cascade);`}
              </pre>
            </CardContent>
            </Card>
          </section>
        </main>
      </div>

    </>
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
