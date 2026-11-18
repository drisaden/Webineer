"use client";

import { formatTime } from "@/lib/datetime";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useClientOrigin } from "@/lib/use-client-value";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Loader2, RefreshCw, Save, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DATA_SECTION_KEYS, WORKFLOW_SECTIONS } from "@/lib/webinar-workflow/defaults";
import { evaluateWorkflow } from "@/lib/webinar-workflow/validation";
import type { PaymentAvailability, WorkflowPayload } from "@/services/webinar-workflow-service";
import type {
  SectionState,
  WebinarWorkflowConfig,
  WorkflowDataSectionKey,
  WorkflowSectionData,
  WorkflowSectionKey,
} from "@/types";
import { WorkflowTimeline } from "./workflow-timeline";
import type { SectionProps, WorkflowContextInfo } from "./section-types";
import { ConfigurationSection } from "./sections/configuration-section";
import { SchedulesSection } from "./sections/schedules-section";
import { RegistrationSection } from "./sections/registration-section";
import { NotificationsSection } from "./sections/notifications-section";
import { IntegrationsSection } from "./sections/integrations-section";
import { ThankYouSection } from "./sections/thank-you-section";
import { LiveSection } from "./sections/live-section";
import { ReplaySection } from "./sections/replay-section";
import { FinishSection } from "./sections/finish-section";

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; at: Date }
  | { status: "error"; message: string; conflict?: boolean };

function pickSections(config: WebinarWorkflowConfig): WorkflowSectionData {
  return {
    configuration: config.configuration,
    schedules: config.schedules,
    registration: config.registration,
    notifications: config.notifications,
    integrations: config.integrations,
    thankYou: config.thankYou,
    live: config.live,
    replay: config.replay,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const AUTOSAVE_DELAY_MS = 1800;

export function WebinarWorkflow({
  initialPayload,
  initialConfig,
  initialSection,
  appOrigin: serverOrigin,
  payment,
  livePlan,
}: {
  initialPayload: WorkflowPayload | null;
  initialConfig: WebinarWorkflowConfig;
  initialSection: WorkflowSectionKey;
  appOrigin: string;
  payment: PaymentAvailability;
  livePlan: WorkflowContextInfo["livePlan"];
}) {
  const [meta, setMeta] = useState(initialPayload?.webinar ?? null);
  const [config, setConfig] = useState<WebinarWorkflowConfig>(initialPayload?.config ?? initialConfig);
  const [analytics, setAnalytics] = useState(initialPayload?.analytics ?? null);
  const [draft, setDraft] = useState<WorkflowSectionData>(() => pickSections(initialPayload?.config ?? initialConfig));
  const [saved, setSaved] = useState<WorkflowSectionData>(() => pickSections(initialPayload?.config ?? initialConfig));
  const [active, setActive] = useState<WorkflowSectionKey>(initialSection);
  const [revealed, setRevealed] = useState<Set<WorkflowSectionKey>>(() => new Set(initialPayload ? DATA_SECTION_KEYS : []));
  // Sections the owner has worked through in this session (Next / Save draft); saved with the webinar.
  const [reviewed, setReviewed] = useState<WorkflowDataSectionKey[]>([]);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);
  const clientOrigin = useClientOrigin();
  const appOrigin = serverOrigin || clientOrigin;

  // Refs give async save logic the latest values without stale closures.
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  const metaRef = useRef(meta);
  const configRef = useRef(config);
  const reviewedRef = useRef(reviewed);
  useLayoutEffect(() => {
    draftRef.current = draft;
    savedRef.current = saved;
    metaRef.current = meta;
    configRef.current = config;
  }, [draft, saved, meta, config]);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const rerun = useRef(false);

  const dirtySections = useMemo(
    () => DATA_SECTION_KEYS.filter((key) => !same(draft[key], saved[key])),
    [draft, saved],
  );
  const isDirty = dirtySections.length > 0;

  const evaluation = useMemo(
    () => evaluateWorkflow({ ...config, ...draft }, { published: meta ? meta.status !== "draft" : false, dirtySections, reviewedSections: reviewed }),
    [config, draft, meta, dirtySections, reviewed],
  );

  const states = useMemo(() => {
    const result = {} as Record<WorkflowSectionKey, SectionState>;
    for (const { key } of WORKFLOW_SECTIONS) result[key] = evaluation.sections[key].state;
    return result;
  }, [evaluation]);

  const applyPayload = useCallback((payload: WorkflowPayload, sent: Partial<WorkflowSectionData>) => {
    const serverSections = pickSections(payload.config);
    // Update refs immediately so code awaiting a save sees the new state before re-render.
    metaRef.current = payload.webinar;
    configRef.current = payload.config;
    savedRef.current = serverSections;
    setMeta(payload.webinar);
    setConfig(payload.config);
    setAnalytics(payload.analytics);
    setSaved(serverSections);
    // Adopt the server's copy only for sections that haven't changed since they were sent.
    setDraft((current) => {
      const next = { ...current };
      for (const key of DATA_SECTION_KEYS) {
        const k = key as WorkflowDataSectionKey;
        if (sent[k] !== undefined && same(current[k], sent[k])) {
          (next as Record<string, unknown>)[k] = serverSections[k];
        }
      }
      return next;
    });
  }, []);

  const performSave = useCallback(async (): Promise<boolean> => {
    const currentDraft = draftRef.current;
    const dirty = DATA_SECTION_KEYS.filter((key) => !same(currentDraft[key], savedRef.current[key]));
    const webinar = metaRef.current;
    // Edited sections and sections the owner continued past count as worked through.
    const alreadyReviewed = configRef.current.reviewedSections ?? [];
    const newlyReviewed = DATA_SECTION_KEYS.filter((key) => (reviewedRef.current.includes(key) || dirty.includes(key)) && !alreadyReviewed.includes(key));
    if (webinar && dirty.length === 0 && newlyReviewed.length === 0) return true;

    const sections: Partial<WorkflowSectionData> = {};
    for (const key of webinar ? dirty : DATA_SECTION_KEYS) {
      (sections as Record<string, unknown>)[key] = currentDraft[key];
    }
    setSaveState({ status: "saving" });
    try {
      const response = await fetch(webinar ? `/api/webinars/${webinar.id}` : "/api/webinars", {
        method: webinar ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sections,
          ...(webinar ? { baseVersion: configRef.current.version } : {}),
          ...(newlyReviewed.length ? { reviewed: newlyReviewed } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof data?.error === "string" ? data.error : response.status === 401 ? "Your session expired. Sign in again." : "Saving failed. Check your connection and try again.";
        setSaveState({ status: "error", message, conflict: response.status === 409 });
        return false;
      }
      const payload = data as WorkflowPayload;
      applyPayload(payload, sections);
      if (!webinar) {
        const params = new URLSearchParams(window.location.search);
        window.history.replaceState(null, "", `/dashboard/webinars/${payload.webinar.id}/setup${params.toString() ? `?${params}` : ""}`);
      }
      setSaveState({ status: "saved", at: new Date() });
      return true;
    } catch {
      setSaveState({ status: "error", message: "You appear to be offline. Your changes are kept here; we'll retry when you save again." });
      return false;
    }
  }, [applyPayload]);

  /** Serialised save: never more than one request in flight (prevents duplicate submissions). */
  const save = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) {
      rerun.current = true;
      return inFlight.current;
    }
    const run = (async () => {
      let ok = await performSave();
      while (ok && rerun.current) {
        rerun.current = false;
        ok = await performSave();
      }
      rerun.current = false;
      return ok;
    })();
    inFlight.current = run;
    try {
      return await run;
    } finally {
      inFlight.current = null;
    }
  }, [performSave]);

  // Debounced autosave. New webinars are only created once they have a title,
  // so browsing the editor never litters the workspace with empty drafts.
  useEffect(() => {
    if (!isDirty) return;
    if (!meta && draft.configuration.title.trim().length < 3) return;
    if (saveState.status === "error" && saveState.conflict) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, isDirty, meta, save, saveState]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (isDirty || saveState.status === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, saveState.status]);

  const update = useCallback<SectionProps["update"]>((key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  /** Record that the owner has finished with a section (Next or Save draft). */
  const markReviewed = useCallback((key: WorkflowSectionKey) => {
    if (key === "finish" || reviewedRef.current.includes(key)) return;
    const next = [...reviewedRef.current, key];
    reviewedRef.current = next;
    setReviewed(next);
  }, []);

  const goTo = useCallback(
    (key: WorkflowSectionKey, options?: { done?: boolean }) => {
      if (options?.done) markReviewed(active);
      setRevealed((current) => new Set(current).add(active));
      setActive(key);
      const params = new URLSearchParams(window.location.search);
      params.set("section", key);
      window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
      document.getElementById("workflow-content")?.scrollIntoView({ block: "start", behavior: "smooth" });
      if (meta && (isDirty || options?.done)) void save();
    },
    [active, isDirty, markReviewed, meta, save],
  );

  const saveDraft = useCallback(() => {
    markReviewed(active);
    void save();
  }, [active, markReviewed, save]);
  const activeReviewed = active === "finish" || reviewed.includes(active) || (config.reviewedSections ?? []).includes(active);

  const publish = useCallback(async () => {
    setPublishError(null);
    setRevealed(new Set(DATA_SECTION_KEYS));
    if (!evaluation.canPublish) {
      setPublishError("Some sections still need attention. Use the Edit links below to fix them.");
      return;
    }
    setPublishing(true);
    try {
      const ok = await save();
      if (!ok || !metaRef.current) {
        setPublishError("Your latest changes could not be saved, so the webinar was not published.");
        return;
      }
      const response = await fetch(`/api/webinars/${metaRef.current.id}/publish`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPublishError(typeof data?.error === "string" ? data.error : "Publishing failed. Please try again.");
        return;
      }
      applyPayload(data as WorkflowPayload, {});
      setJustPublished(true);
    } catch {
      setPublishError("Publishing failed because the server could not be reached.");
    } finally {
      setPublishing(false);
    }
  }, [applyPayload, evaluation.canPublish, save]);

  const index = WORKFLOW_SECTIONS.findIndex((s) => s.key === active);
  const sectionMeta = WORKFLOW_SECTIONS[index];
  const context: WorkflowContextInfo = {
    webinarId: meta?.id ?? null,
    slug: meta?.slug ?? null,
    publicId: config.publicId,
    status: meta?.status ?? "draft",
    appOrigin,
    payment,
    analytics,
    webhookSecret: config.integrations.webhook.secret,
    dirtySections,
    livePlan,
  };
  const previewHref = meta?.slug ? `/w/${meta.slug}${meta.status === "draft" ? "?preview=1" : ""}` : null;

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex min-w-0 flex-col gap-3 rounded-[1.5rem] border border-border bg-white p-4 shadow-soft md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/webinars" className="tap text-xs font-medium text-secondaryText hover:text-primaryText">
              All webinars
            </Link>
            <span className="text-xs text-secondaryText">/</span>
            <Badge label={meta ? meta.status : "new draft"} tone={meta && meta.status !== "draft" ? "success" : "default"} />
          </div>
          <h2 className="mt-1 truncate text-lg text-primaryText">{draft.configuration.title.trim() || "Untitled webinar"}</h2>
          <SaveIndicator state={saveState} dirty={isDirty} hasWebinar={Boolean(meta)} titleReady={draft.configuration.title.trim().length >= 3} onRetry={() => void save()} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={saveDraft} disabled={saveState.status === "saving" || (Boolean(meta) && !isDirty && activeReviewed)}>
            {saveState.status === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save draft
          </Button>
          {previewHref ? (
            <Button asChild variant="secondary" size="sm">
              <a href={previewHref} target="_blank" rel="noopener">
                <Eye className="mr-2 h-4 w-4" /> Preview
              </a>
            </Button>
          ) : (
            <Button type="button" variant="secondary" size="sm" disabled title="Save the draft first to preview it">
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
          )}
          <Button type="button" size="sm" onClick={() => goTo("finish")}>
            <Send className="mr-2 h-4 w-4" /> {meta && meta.status !== "draft" ? "Review & update" : "Publish"}
          </Button>
        </div>
      </div>

      <WorkflowTimeline active={active} states={states} onSelect={goTo} />

      <div id="workflow-content" className="min-w-0 scroll-mt-4 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-secondaryText">
              Step {index + 1} of {WORKFLOW_SECTIONS.length}
            </p>
            <h2 className="mt-1 text-xl text-primaryText">{sectionMeta.label}</h2>
            <p className="mt-1 text-sm text-secondaryText">{sectionMeta.description}</p>
          </div>
        </div>

        {active === "configuration" && <ConfigurationSection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.configuration.issues} showErrors={revealed.has("configuration")} />}
        {active === "schedules" && <SchedulesSection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.schedules.issues} showErrors={revealed.has("schedules")} />}
        {active === "registration" && <RegistrationSection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.registration.issues} showErrors={revealed.has("registration")} />}
        {active === "notifications" && <NotificationsSection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.notifications.issues} showErrors={revealed.has("notifications")} />}
        {active === "integrations" && <IntegrationsSection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.integrations.issues} showErrors={revealed.has("integrations")} />}
        {active === "thankYou" && <ThankYouSection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.thankYou.issues} showErrors={revealed.has("thankYou")} />}
        {active === "live" && <LiveSection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.live.issues} showErrors={revealed.has("live")} />}
        {active === "replay" && <ReplaySection draft={draft} update={update} goTo={goTo} context={context} issues={evaluation.sections.replay.issues} showErrors={revealed.has("replay")} />}
        {active === "finish" && (
          <FinishSection
            draft={draft}
            showErrors
            goTo={goTo}
            context={context}
            evaluation={evaluation}
            onSaveDraft={() => void save()}
            onPublish={() => void publish()}
            saving={saveState.status === "saving"}
            publishing={publishing}
            publishError={publishError}
            justPublished={justPublished}
          />
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="secondary" onClick={() => goTo(WORKFLOW_SECTIONS[index - 1].key)} disabled={index === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{index > 0 ? WORKFLOW_SECTIONS[index - 1].label : "Previous"}</span>
            <span className="sm:hidden">Previous</span>
          </Button>
          {index < WORKFLOW_SECTIONS.length - 1 && (
            <Button type="button" onClick={() => goTo(WORKFLOW_SECTIONS[index + 1].key, { done: true })}>
              <span className="hidden sm:inline">{WORKFLOW_SECTIONS[index + 1].label}</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SaveIndicator({
  state,
  dirty,
  hasWebinar,
  titleReady,
  onRetry,
}: {
  state: SaveState;
  dirty: boolean;
  hasWebinar: boolean;
  titleReady: boolean;
  onRetry: () => void;
}) {
  let content: React.ReactNode;
  if (state.status === "saving") {
    content = (
      <span className="inline-flex items-center gap-1.5 text-secondaryText">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  } else if (state.status === "error") {
    content = (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-[#B33A3A]">
        <TriangleAlert className="h-3.5 w-3.5" /> {state.message}
        {state.conflict ? (
          <button type="button" className="font-medium underline" onClick={() => window.location.reload()}>
            Reload
          </button>
        ) : (
          <button type="button" className="inline-flex items-center gap-1 font-medium underline" onClick={onRetry}>
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        )}
      </span>
    );
  } else if (dirty) {
    content = (
      <span className="text-[#8A5A0E]">
        {hasWebinar || titleReady ? "Unsaved changes — saving automatically" : "Add a title (3+ characters) to start saving this draft automatically"}
      </span>
    );
  } else if (state.status === "saved") {
    content = (
      <span className="inline-flex items-center gap-1.5 text-[#0F7B52]">
        <CheckCircle2 className="h-3.5 w-3.5" /> All changes saved at {formatTime(state.at)}
      </span>
    );
  } else {
    content = <span className="text-secondaryText">{hasWebinar ? "All changes saved" : "New draft — not saved yet"}</span>;
  }
  return (
    <p className="mt-1 text-xs" role="status" aria-live="polite">
      {content}
    </p>
  );
}
