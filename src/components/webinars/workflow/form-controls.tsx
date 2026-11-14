"use client";

import { useId, useState, type ReactNode } from "react";
import { AlertTriangle, Check, CircleAlert, Copy, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowIssue } from "@/types";

export function SectionCard({
  title,
  description,
  icon,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("min-w-0 rounded-[1.5rem] border border-border bg-white p-5 shadow-soft md:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAFBF5] text-[#0F7B52]">{icon}</div>}
          <div className="min-w-0">
            <h3 className="text-base text-primaryText">{title}</h3>
            {description && <p className="mt-1 text-sm text-secondaryText">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  optional,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
  optional?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-sm font-medium text-primaryText">
        {label}
        {optional && <span className="text-xs font-normal text-secondaryText">Optional</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-[#B33A3A]">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-secondaryText">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
};

export function TextInput({ label, value, onChange, hint, error, optional, className, id, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} optional={optional} className={className}>
      <input
        id={inputId}
        className={cn("input-field", error && "border-[#DC5353]")}
        value={value}
        aria-invalid={Boolean(error) || undefined}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  error,
  optional,
  rows = 4,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} optional={optional}>
      <textarea
        id={id}
        rows={rows}
        className={cn("input-field resize-y", error && "border-[#DC5353]")}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error) || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function SelectInput<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  optional,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} optional={optional}>
      <select id={id} className="input-field" value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start justify-between gap-4 rounded-xl border border-border bg-[#F7F9FC] p-3.5", disabled && "opacity-60")}>
      <div className="min-w-0">
        <label htmlFor={id} className="flex flex-wrap items-center gap-2 text-sm font-medium text-primaryText">
          {label}
          {badge}
        </label>
        {description && <p className="mt-0.5 text-xs text-secondaryText">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/60",
          checked ? "bg-[#16D6B2]" : "bg-[#CBD5E1]",
        )}
      >
        <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
  error,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: ReactNode;
  error?: string;
  suffix?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          className="input-field"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = event.target.value === "" ? 0 : Number(event.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
        />
        {suffix && <span className="shrink-0 text-sm text-secondaryText">{suffix}</span>}
      </div>
    </Field>
  );
}

export function CopyField({ label, value, multiline, hint }: { label: string; value: string; multiline?: boolean; hint?: ReactNode }) {
  const id = useId();
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2000);
  };
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
        {multiline ? (
          <textarea id={id} readOnly rows={4} value={value} className="input-field min-w-0 flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        ) : (
          <input id={id} readOnly value={value} className="input-field min-w-0 flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        )}
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-primaryText hover:bg-[#EEF2F7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/60"
          aria-live="polite"
        >
          {copied === "copied" ? <Check className="h-4 w-4 text-[#16A36A]" /> : <Copy className="h-4 w-4" />}
          {copied === "copied" ? "Copied" : copied === "failed" ? "Copy failed" : "Copy"}
        </button>
      </div>
    </Field>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-[#D6E6FB] bg-[#F2F7FE] text-[#2F5E9E]",
    warning: "border-[#F5E1BC] bg-[#FFF8EA] text-[#8A5A0E]",
    success: "border-[#D9F5EC] bg-[#EAFBF5] text-[#0F7B52]",
    error: "border-[#F5D7D7] bg-[#FFF6F6] text-[#B33A3A]",
  }[tone];
  const Icon = tone === "warning" || tone === "error" ? AlertTriangle : tone === "success" ? Check : Info;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border p-3 text-sm", styles)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function UnavailableBadge({ label = "Not available yet" }: { label?: string }) {
  return <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#64748B]">{label}</span>;
}

export function IssueSummary({ issues, show }: { issues: WorkflowIssue[]; show: boolean }) {
  if (!show || issues.length === 0) return null;
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return (
    <div className="space-y-2" aria-live="polite">
      {errors.length > 0 && (
        <Notice tone="error">
          <p className="font-medium">Needs attention before publishing</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {errors.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      )}
      {warnings.length > 0 && (
        <Notice tone="warning">
          <ul className="list-disc space-y-0.5 pl-4">
            {warnings.map((issue) => (
              <li key={issue.message}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
}

export function errorFor(issues: WorkflowIssue[], field: string, show: boolean): string | undefined {
  if (!show) return undefined;
  return issues.find((i) => i.severity === "error" && i.field === field)?.message;
}

export function ChoiceChips<T extends string | number>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-primaryText">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0AEBCB]/60",
                active ? "border-[#041B5E] bg-[#041B5E] text-white" : "border-border bg-white text-primaryText hover:bg-[#EEF2F7]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];
