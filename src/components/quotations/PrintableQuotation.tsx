import { SlidingDoorDrawing } from "@/components/drawings/SlidingDoorDrawing";
import { cn } from "@/lib/utils";
import type { Quotation } from "./types";

type PrintableQuotationProps = {
  quotation?: Quotation;
  className?: string;
};

export function PrintableQuotation({
  quotation,
  className,
}: PrintableQuotationProps) {
  if (!quotation) {
    return (
      <section className={cn("quotation-print-document", className)}>
        <div className="text-sm text-slate-700">No quotation selected.</div>
      </section>
    );
  }

  return (
    <section className={cn("quotation-print-document", className)}>
      <header className="quotation-print-header">
        <div>
          <h1 className="text-2xl font-bold">Home Glass 2003</h1>
          <p className="text-sm">Quotation / Dimension Sign-off</p>
        </div>

        <div className="text-sm">
          <div>
            <span className="font-semibold">Quote #:</span> {quotation.quoteNumber}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {quotation.quoteDate}
          </div>
          <div>
            <span className="font-semibold">Status:</span> {quotation.status}
          </div>
        </div>
      </header>

      <section className="quotation-print-meta">
        <div>
          <span className="font-semibold">Customer:</span> {quotation.customerName || "-"}
        </div>
        <div>
          <span className="font-semibold">Phone:</span> {quotation.customerPhone || "-"}
        </div>
        <div>
          <span className="font-semibold">Project:</span> {quotation.projectName || "-"}
        </div>
        <div>
          <span className="font-semibold">Location:</span> {quotation.location || "-"}
        </div>
      </section>

      {quotation.items.map((item) => (
        <article key={item.id} className="quote-print-item">
          <div className="quote-print-core">
            <div className="mb-2 flex items-center justify-between gap-3 border-b border-slate-300 pb-2">
              <div>
                <div className="text-base font-semibold">{item.itemCode}</div>
                <div className="text-sm">{item.productName}</div>
              </div>
              <div className="text-sm">Quantity: {item.quantity} set(s)</div>
            </div>

            <SlidingDoorDrawing
              widthMm={item.widthMm}
              heightMm={item.heightMm}
              floorLevelMm={item.floorLevelMm}
              panelCount={item.panelCount}
              quantity={item.quantity}
              showTopView={false}
              showLock={item.showLock}
              lockPosition={item.lockPosition}
              viewDirection={item.viewDirection}
              itemCode={item.itemCode}
              productName={item.productName}
              className="print-drawing"
            />
          </div>

          <table className="quote-print-spec-table mt-2 w-full border-collapse text-sm">
            <tbody>
              <PrintableRow label="Width" value={`${item.widthMm} mm`} />
              <PrintableRow label="Height" value={`${item.heightMm} mm`} />
              <PrintableRow
                label="Floor level"
                value={
                  typeof item.floorLevelMm === "number"
                    ? `${item.floorLevelMm} mm`
                    : "-"
                }
              />
              <PrintableRow label="Panels" value={`${item.panelCount}`} />
              <PrintableRow label="Aluminum color" value={item.aluminumColor} />
              <PrintableRow label="Glass" value={item.glassType} />
              <PrintableRow label="Hardware" value={item.hardware} />
              <PrintableRow label="View direction" value={item.viewDirection} />
              <PrintableRow
                label="Lock"
                value={item.showLock ? `Yes (${item.lockPosition})` : "No"}
              />
              <PrintableRow label="Install location" value={item.location || "-"} />
              <PrintableRow label="Notes" value={item.notes || "-"} />
            </tbody>
          </table>
        </article>
      ))}

      <footer className="quotation-signoff mt-4 border-t border-slate-400 pt-3 text-sm">
        <p>
          The customer confirms that all product dimensions, opening direction,
          glass type, frame color, hardware, quantity, and installation location
          shown in this quotation are correct and approved for production.
        </p>
        <p className="mt-2">
          ลูกค้าได้ตรวจสอบและยืนยันขนาดสินค้า ทิศทางการเปิด-ปิด ประเภทกระจก
          สีกรอบ อุปกรณ์ จำนวนชุด และตำแหน่งติดตั้ง
          ตามแบบและใบเสนอราคานี้ถูกต้องแล้ว และอนุมัติให้ดำเนินการผลิตได้
        </p>

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <div>Customer signature</div>
            <div className="mt-6 border-b border-slate-500" />
          </div>
          <div>
            <div>Date</div>
            <div className="mt-6 border-b border-slate-500" />
          </div>
          <div>
            <div>Salesperson / Prepared by</div>
            <div className="mt-6 border-b border-slate-500" />
          </div>
        </div>

        <p className="mt-3 text-xs">Please verify all dimensions before signing.</p>
      </footer>
    </section>
  );
}

function PrintableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="w-44 border border-slate-300 bg-slate-50 px-2 py-1 text-left font-semibold">
        {label}
      </th>
      <td className="border border-slate-300 px-2 py-1">{value}</td>
    </tr>
  );
}
