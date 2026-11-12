import type {
  AutomationActionType,
  AutomationExecution,
  AutomationTriggerEvent,
  AutomationWorkflow,
} from "@/types";
import { getEmailProvider } from "@/providers/email";
import { dispatchWebhook } from "@/providers/webhooks/dispatcher";
import { mockWebinarRepository } from "./mock-webinar-repository";

// Default initial automation workflows
export const initialWorkflows: AutomationWorkflow[] = [
  {
    id: "wf_001",
    workspaceId: "ws_001",
    webinarId: "wb_001",
    name: "Instant Welcome & 24h Countdown",
    description: "Automatically confirms seat reservation and dispatches 24h reminder to registered attendees.",
    trigger: "registration_completed",
    enabled: true,
    createdAt: "2026-11-01T10:00:00Z",
    updatedAt: "2026-11-09T14:30:00Z",
    executionCount: 142,
    steps: [
      {
        id: "step_1",
        type: "action",
        actionType: "send_email",
        actionPayload: { templateType: "registration_confirmation" },
      },
      {
        id: "step_2",
        type: "action",
        actionType: "add_tag",
        actionPayload: { tag: "registered-lead" },
      },
      {
        id: "step_3",
        type: "delay",
        delayMinutes: 1440,
      },
      {
        id: "step_4",
        type: "action",
        actionType: "send_email",
        actionPayload: { templateType: "reminder_24h" },
      },
    ],
  },
  {
    id: "wf_002",
    workspaceId: "ws_001",
    webinarId: "wb_001",
    name: "VIP Ticket Upsell & Tagging",
    description: "Tags paid ticket purchasers as VIP customer and triggers payment receipt.",
    trigger: "ticket_purchased",
    enabled: true,
    createdAt: "2026-11-02T11:00:00Z",
    updatedAt: "2026-11-08T16:00:00Z",
    executionCount: 38,
    steps: [
      {
        id: "step_1",
        type: "action",
        actionType: "add_tag",
        actionPayload: { tag: "paid-attendee" },
      },
      {
        id: "step_2",
        type: "action",
        actionType: "send_email",
        actionPayload: { templateType: "purchase_confirmation" },
      },
    ],
  },
  {
    id: "wf_003",
    workspaceId: "ws_001",
    name: "Post-Webinar Replay Sequence",
    description: "When webinar replay becomes available, notify all non-attendees with the recording link.",
    trigger: "replay_available",
    enabled: true,
    createdAt: "2026-11-04T09:00:00Z",
    updatedAt: "2026-11-08T09:00:00Z",
    executionCount: 89,
    steps: [
      {
        id: "step_1",
        type: "action",
        actionType: "send_email",
        actionPayload: { templateType: "replay_available" },
      },
    ],
  },
];

const inMemoryWorkflows: AutomationWorkflow[] = [...initialWorkflows];
const inMemoryExecutions: AutomationExecution[] = [
  {
    id: "exec_001",
    workflowId: "wf_001",
    workflowName: "Instant Welcome & 24h Countdown",
    triggerEvent: "registration_completed",
    targetId: "reg_001",
    status: "completed",
    idempotencyKey: "idem_wf_001_reg_001",
    startedAt: "2026-11-08T12:00:00Z",
    completedAt: "2026-11-08T12:00:05Z",
    logs: [
      "Trigger received: registration_completed for Jordan Lee (reg_001)",
      "Action: send_email (registration_confirmation) dispatched via DevelopmentLogEmailProvider",
      "Action: add_tag ('registered-lead') applied to contact",
      "Workflow executed successfully.",
    ],
  },
  {
    id: "exec_002",
    workflowId: "wf_002",
    workflowName: "VIP Ticket Upsell & Tagging",
    triggerEvent: "ticket_purchased",
    targetId: "reg_002",
    status: "completed",
    idempotencyKey: "idem_wf_002_reg_002",
    startedAt: "2026-11-07T17:15:00Z",
    completedAt: "2026-11-07T17:15:02Z",
    logs: [
      "Trigger received: ticket_purchased for Priya Shah",
      "Action: add_tag ('paid-attendee') applied",
      "Action: send_email (purchase_confirmation) simulated",
      "Workflow executed successfully.",
    ],
  },
];

export class AutomationEngine {
  listWorkflows(workspaceId = "ws_001"): AutomationWorkflow[] {
    return inMemoryWorkflows.filter((w) => w.workspaceId === workspaceId);
  }

  getWorkflowById(id: string): AutomationWorkflow | undefined {
    return inMemoryWorkflows.find((w) => w.id === id);
  }

  saveWorkflow(workflow: AutomationWorkflow) {
    const idx = inMemoryWorkflows.findIndex((w) => w.id === workflow.id);
    if (idx >= 0) {
      inMemoryWorkflows[idx] = { ...workflow, updatedAt: new Date().toISOString() };
    } else {
      inMemoryWorkflows.push({ ...workflow, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }

  deleteWorkflow(id: string) {
    const idx = inMemoryWorkflows.findIndex((w) => w.id === id);
    if (idx >= 0) inMemoryWorkflows.splice(idx, 1);
  }

  toggleWorkflow(id: string, enabled: boolean) {
    const wf = this.getWorkflowById(id);
    if (wf) wf.enabled = enabled;
  }

  listExecutions(): AutomationExecution[] {
    return inMemoryExecutions;
  }

  // Event Trigger Dispatcher with Idempotency Protection
  async triggerEvent(
    event: AutomationTriggerEvent,
    data: {
      workspaceId?: string;
      webinarId?: string;
      targetId: string;
      recipientEmail?: string;
      recipientName?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<AutomationExecution[]> {
    const workspaceId = data.workspaceId || "ws_001";
    const matchingWorkflows = inMemoryWorkflows.filter(
      (wf) =>
        wf.enabled &&
        wf.workspaceId === workspaceId &&
        wf.trigger === event &&
        (!wf.webinarId || wf.webinarId === data.webinarId),
    );

    const results: AutomationExecution[] = [];

    for (const wf of matchingWorkflows) {
      const idempotencyKey = `idem_${wf.id}_${data.targetId}_${event}`;
      
      // Idempotency check: prevent duplicate execution
      const existing = inMemoryExecutions.find((ex) => ex.idempotencyKey === idempotencyKey);
      if (existing) {
        continue;
      }

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const logs: string[] = [`Trigger fired: ${event} on target ${data.targetId}`];

      const execution: AutomationExecution = {
        id: executionId,
        workflowId: wf.id,
        workflowName: wf.name,
        triggerEvent: event,
        targetId: data.targetId,
        status: "running",
        idempotencyKey,
        startedAt: new Date().toISOString(),
        logs,
      };

      inMemoryExecutions.unshift(execution);

      try {
        const emailProvider = getEmailProvider();
        const webinar = data.webinarId ? mockWebinarRepository.getById(data.webinarId) : undefined;

        for (const step of wf.steps) {
          if (step.type === "action" && step.actionType) {
            logs.push(`Executing action: ${step.actionType}`);

            if (step.actionType === "send_email" && data.recipientEmail) {
              const templateType = (step.actionPayload?.templateType as any) || "registration_confirmation";
              await emailProvider.sendEmail({
                workspaceId,
                webinarId: data.webinarId,
                recipientEmail: data.recipientEmail,
                recipientName: data.recipientName || "Attendee",
                templateType,
                variables: {
                  first_name: data.recipientName?.split(" ")[0] || "Friend",
                  last_name: data.recipientName?.split(" ")[1] || "",
                  webinar_title: webinar?.title || "Webinar Session",
                  webinar_date: webinar?.schedule.startsAt ? new Date(webinar.schedule.startsAt).toLocaleDateString() : "Upcoming",
                  webinar_time: webinar?.schedule.startsAt ? new Date(webinar.schedule.startsAt).toLocaleTimeString() : "TBD",
                  webinar_timezone: webinar?.schedule.timezone || "UTC",
                  webinar_link: webinar?.slug ? `/w/${webinar.slug}` : "/dashboard",
                  replay_link: webinar?.slug ? `/room/${webinar.slug}` : "/dashboard",
                  host_name: "Webineer Host",
                },
              });
              logs.push(`Dispatched email (${templateType}) to ${data.recipientEmail}`);
            }

            if (step.actionType === "add_tag" && step.actionPayload?.tag) {
              logs.push(`Tag applied: ${step.actionPayload.tag}`);
            }
          }
        }

        execution.status = "completed";
        execution.completedAt = new Date().toISOString();
        wf.executionCount += 1;
        results.push(execution);
      } catch (err: unknown) {
        execution.status = "failed";
        execution.error = err instanceof Error ? err.message : "Workflow execution failed";
        execution.completedAt = new Date().toISOString();
        results.push(execution);
      }
    }

    return results;
  }
}

export const automationEngine = new AutomationEngine();
