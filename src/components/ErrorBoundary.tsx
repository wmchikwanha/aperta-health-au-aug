import { Component, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export async function reportClientError(error_type: string, message: string, stack?: string) {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await supabase.from("error_log").insert({
      error_type, source: "client", user_id: uid,
      message: message.slice(0, 2000), stack_trace: stack?.slice(0, 8000) ?? null,
      url: window.location.pathname.slice(0, 500), user_agent: navigator.userAgent.slice(0, 500),
    });
  } catch { /* never throw from the reporter */ }
}

let bound = false;
export function bindGlobalErrorReporting() {
  if (bound) return; bound = true;
  window.addEventListener("error", (e) => reportClientError("window_error", e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => {
    const r: any = e.reason;
    reportClientError("unhandled_rejection", String(r?.message ?? r), r?.stack);
  });
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    reportClientError("render_crash", error.message, `${error.stack ?? ""}\n${info.componentStack ?? ""}`);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">This screen hit an unexpected error. It has been logged for the safety team. No clinical data was changed.</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
}
