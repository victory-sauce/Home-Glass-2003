import {
  ClipboardList,
  History,
  Layers,
  LayoutDashboard,
  PackagePlus,
  Recycle,
  Scissors,
  Settings,
} from "lucide-react";

export type ActiveView =
  | "dashboard"
  | "newOrder"
  | "openOrders"
  | "inventory"
  | "cutPlanner"
  | "leftovers"
  | "auditLogs"
  | "settings";

interface AppSidebarProps {
  activeView: ActiveView;
  onChange: (view: ActiveView) => void;
}

const navItems: Array<{
  value: ActiveView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "newOrder", label: "New Order", icon: PackagePlus },
  { value: "openOrders", label: "Open Orders", icon: ClipboardList },
  { value: "inventory", label: "Racks / Inventory", icon: Layers },
  { value: "cutPlanner", label: "Cut Planner", icon: Scissors },
  { value: "leftovers", label: "Offcuts / Leftovers", icon: Recycle },
  { value: "auditLogs", label: "Audit Logs", icon: History },
  { value: "settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ activeView, onChange }: AppSidebarProps) {
  return (
    <>
      <aside className="fixed left-0 top-0 hidden h-screen w-60 border-r border-slate-200 bg-white md:block">
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-lg font-bold text-slate-900">Home Glass 2003</p>
            <p className="text-xs text-slate-500">Inventory dashboard</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onChange(item.value)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    active
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="border-b border-slate-200 bg-white p-3 md:hidden">
        <div className="mb-3">
          <p className="text-base font-semibold text-slate-900">Home Glass 2003</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onChange(item.value)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                  active
                    ? "border-blue-300 bg-blue-100 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
