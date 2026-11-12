import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";

export function DashboardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="app-shell relative flex min-h-screen overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(10,235,203,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(4,27,94,0.12),transparent_30%)]" />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader title={title} />
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-6 flex items-center justify-between gap-3 rounded-[1.5rem] border border-white/60 bg-white/65 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-secondaryText">Workspace</p>
              <h1 className="mt-1 text-2xl text-primaryText">{title}</h1>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
