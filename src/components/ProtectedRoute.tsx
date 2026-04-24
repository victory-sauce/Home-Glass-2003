import { ReactNode } from "react";

// Auth temporarily disabled for internal test mode.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
