import type {
  RegistrationAnalyticsSummary,
  WebinarStatus,
  WorkflowDataSectionKey,
  WorkflowEvaluation,
  WorkflowIssue,
  WorkflowSectionData,
  WorkflowSectionKey,
} from "@/types";
import type { PaymentAvailability } from "@/services/webinar-workflow-service";

export interface WorkflowContextInfo {
  webinarId: string | null;
  slug: string | null;
  publicId: string;
  status: WebinarStatus;
  appOrigin: string;
  payment: PaymentAvailability;
  analytics: RegistrationAnalyticsSummary | null;
  webhookSecret: string;
  dirtySections: WorkflowDataSectionKey[];
}

export interface SectionProps {
  draft: WorkflowSectionData;
  update: <K extends WorkflowDataSectionKey>(key: K, value: WorkflowSectionData[K]) => void;
  issues: WorkflowIssue[];
  showErrors: boolean;
  goTo: (key: WorkflowSectionKey) => void;
  context: WorkflowContextInfo;
}

export interface FinishProps extends Omit<SectionProps, "update" | "issues"> {
  evaluation: WorkflowEvaluation;
  onSaveDraft: () => void;
  onPublish: () => void;
  saving: boolean;
  publishing: boolean;
  publishError: string | null;
  justPublished: boolean;
}
