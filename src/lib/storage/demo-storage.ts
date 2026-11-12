export type DemoPreferenceKey = "theme" | "last-view" | "notification-email";

export function getStoredPreference<T>(key: DemoPreferenceKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function setStoredPreference<T>(key: DemoPreferenceKey, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
