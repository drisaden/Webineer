export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // The in-memory mock store (and its local snapshot file) only backs explicit demo mode.
  const { getAuthMode } = await import("./lib/supabase/config");
  if (getAuthMode() !== "demo") return;
  const { registerMockFilePersistence } = await import("./services/server/mock-file-persistence");
  registerMockFilePersistence();
}
