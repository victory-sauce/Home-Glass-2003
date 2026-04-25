import { useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintableQuotation } from "@/components/quotations/PrintableQuotation";
import { SAMPLE_QUOTATION } from "@/components/quotations/sampleData";

export default function QuotationsPrint() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="screen-only border-b bg-slate-100">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="text-sm font-medium text-slate-700">Quotation print view</div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/quotations")}> 
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Quotations
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-4xl px-4 py-4">
        <PrintableQuotation quotation={SAMPLE_QUOTATION} />
      </main>
    </div>
  );
}
