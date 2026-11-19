"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthFormState,
} from "@/app/(auth)/actions";

const initial: AuthFormState = { status: "idle" };

function FieldError({ state, name }: { state: AuthFormState; name: string }) {
  const message = state.fieldErrors?.[name];
  return message ? (
    <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs text-[#B33A3A]">
      {message}
    </p>
  ) : null;
}

function FormMessage({ state }: { state: AuthFormState }) {
  if (!state.message) return null;
  const ok = state.status === "success";
  return (
    <div role={ok ? "status" : "alert"} className={`rounded-2xl border p-4 text-sm ${ok ? "border-[#D9F7EC] bg-[#EAFBF5] text-[#0F7B52]" : "border-[#F5D7D7] bg-[#FFF6F6] text-[#B33A3A]"}`}>
      {state.message}
    </div>
  );
}

const invalid = (state: AuthFormState, name: string) => (state.fieldErrors?.[name] ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

function PasswordInput({ id, name, autoComplete, state, placeholder }: { id: string; name: string; autoComplete: string; state: AuthFormState; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondaryText" aria-hidden />
      <input id={id} name={name} className="input-field pl-10 pr-12" type={show ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} required maxLength={200} {...invalid(state, name)} />
      <button type="button" className="absolute right-0 top-0 inline-flex h-full w-11 items-center justify-center text-secondaryText" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, demo }: { next: string; demo: boolean }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  return (
    <form action={action} className="space-y-5" noValidate={demo}>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium text-primaryText">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-secondaryText" aria-hidden />
          <input id="email" name="email" className="input-field pl-10" type="email" autoComplete="email" placeholder="you@company.com" defaultValue={state.email} required={!demo} maxLength={200} {...invalid(state, "email")} />
        </div>
        <FieldError state={state} name="email" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-primaryText">Password</label>
          <Link href="/forgot-password" className="tap text-sm text-[#17294B]">Forgot password?</Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" state={state} />
        <FieldError state={state} name="password" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in to Dashboard"}
      </Button>
    </form>
  );
}

export function RegisterForm({ plan }: { plan?: string }) {
  const [state, action, pending] = useActionState(signUpAction, initial);
  if (state.status === "success") return <div className="mt-8"><FormMessage state={state} /></div>;
  return (
    <form action={action} className="mt-8 space-y-5">
      <FormMessage state={state} />
      {plan && <input type="hidden" name="plan" value={plan} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="mb-2 block text-sm font-medium">First name</label>
          <input id="firstName" name="firstName" className="input-field" type="text" autoComplete="given-name" placeholder="Avery" defaultValue={state.values?.firstName} required maxLength={60} {...invalid(state, "firstName")} />
          <FieldError state={state} name="firstName" />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm font-medium">Last name</label>
          <input id="lastName" name="lastName" className="input-field" type="text" autoComplete="family-name" placeholder="Morgan" defaultValue={state.values?.lastName} maxLength={60} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">Work email</label>
        <input id="email" name="email" className="input-field" type="email" autoComplete="email" placeholder="name@company.com" defaultValue={state.email} required maxLength={200} {...invalid(state, "email")} />
        <FieldError state={state} name="email" />
      </div>
      <div>
        <label htmlFor="workspaceName" className="mb-2 block text-sm font-medium">Workspace name</label>
        <input id="workspaceName" name="workspaceName" className="input-field" type="text" placeholder="Northstar Studio" defaultValue={state.values?.workspaceName} required maxLength={80} {...invalid(state, "workspaceName")} />
        <FieldError state={state} name="workspaceName" />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">Password</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="At least 8 characters, with a number" state={state} />
        <FieldError state={state} name="password" />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirm password</label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" placeholder="Repeat your password" state={state} />
        <FieldError state={state} name="confirmPassword" />
      </div>
      <div>
        <label htmlFor="ageConfirmed" className="flex items-start gap-3 text-sm">
          <input id="ageConfirmed" name="ageConfirmed" type="checkbox" value="yes" required className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-[#041B5E]" {...invalid(state, "ageConfirmed")} />
          <span>I confirm that I am at least 18 years old.</span>
        </label>
        <FieldError state={state} name="ageConfirmed" />
        <p className="mt-2 text-xs text-secondaryText">
          By creating an account you agree to our <Link href="/terms" className="font-medium text-[#17294B] underline">Terms</Link> and <Link href="/privacy" className="font-medium text-[#17294B] underline">Privacy Policy</Link>.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Creating account..." : "Create account"}</Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);
  if (state.status === "success") return <div className="mt-8"><FormMessage state={state} /></div>;
  return (
    <form action={action} className="mt-8 space-y-5">
      <FormMessage state={state} />
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">Email address</label>
        <input id="email" name="email" className="input-field" type="email" autoComplete="email" placeholder="you@company.com" defaultValue={state.email} required maxLength={200} {...invalid(state, "email")} />
        <FieldError state={state} name="email" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending..." : "Send reset link"}</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return (
    <form action={action} className="mt-8 space-y-5">
      <FormMessage state={state} />
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">New password</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="At least 8 characters, with a number" state={state} />
        <FieldError state={state} name="password" />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium">Confirm new password</label>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" state={state} />
        <FieldError state={state} name="confirmPassword" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Saving..." : "Set new password"}</Button>
      {state.message?.includes("expired") && (
        <p className="text-center text-sm"><Link href="/forgot-password" className="font-medium text-[#17294B]">Request a new link</Link></p>
      )}
    </form>
  );
}
