import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Quotations from "./pages/Quotations.tsx";
import QuotationsPrint from "./pages/QuotationsPrint.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();
  const isQuotationPrintRoute = location.pathname === "/quotations/print";

  return (
    <AuthProvider>
      {!isQuotationPrintRoute && (
        <div className="screen-only w-full bg-amber-500 text-amber-950 text-center text-sm font-medium py-2 px-4">
          Test mode: authentication disabled
        </div>
      )}

      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotations"
          element={
            <ProtectedRoute>
              <Quotations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quotations/print"
          element={
            <ProtectedRoute>
              <QuotationsPrint />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
