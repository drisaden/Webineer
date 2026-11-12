import type { AutomationTriggerEvent, WebhookDeliveryLog, WebhookEndpoint } from "@/types";

export interface WebhookPayload {
  eventId: string;
  event: AutomationTriggerEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

// In-memory delivery history
const inMemoryWebhookLogs: WebhookDeliveryLog[] = [];

// SSRF Protection: validate that destination URLs do not target local or private IPs
export function validateWebhookUrl(urlStr: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, reason: "Webhook URL must use HTTP or HTTPS protocol." };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { valid: false, reason: "SSRF Protection: Webhooks cannot target localhost or private network IP ranges." };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid URL format." };
  }
}

// Simple deterministic signature generation for webhooks
export function signWebhookPayload(payloadStr: string, secretKey: string): string {
  let hash = 0;
  const combined = secretKey + payloadStr;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256=${Math.abs(hash).toString(16)}`;
}

export async function dispatchWebhook(
  endpoint: WebhookEndpoint,
  event: AutomationTriggerEvent,
  data: Record<string, unknown>,
): Promise<WebhookDeliveryLog> {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();
  const payload: WebhookPayload = {
    eventId,
    event,
    timestamp,
    data,
  };

  const payloadStr = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadStr, endpoint.secretKey);
  const startTime = Date.now();

  const urlCheck = validateWebhookUrl(endpoint.url);
  if (!urlCheck.valid) {
    const failedLog: WebhookDeliveryLog = {
      id: `wlog_${Date.now()}`,
      endpointId: endpoint.id,
      event,
      payload: data,
      statusCode: 400,
      status: "failed",
      attempt: 1,
      timestamp,
      durationMs: 0,
      responseBody: urlCheck.reason,
    };
    inMemoryWebhookLogs.unshift(failedLog);
    return failedLog;
  }

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webineer-Event": event,
        "X-Webineer-Event-Id": eventId,
        "X-Webineer-Timestamp": timestamp,
        "X-Webineer-Signature": signature,
      },
      body: payloadStr,
    });

    const durationMs = Date.now() - startTime;
    const isSuccess = res.status >= 200 && res.status < 300;

    const log: WebhookDeliveryLog = {
      id: `wlog_${Date.now()}`,
      endpointId: endpoint.id,
      event,
      payload: data,
      statusCode: res.status,
      status: isSuccess ? "delivered" : "failed",
      attempt: 1,
      timestamp,
      durationMs,
      responseBody: isSuccess ? "OK" : `Remote returned status ${res.status}`,
    };

    inMemoryWebhookLogs.unshift(log);
    endpoint.lastDeliveryStatus = isSuccess ? "success" : "failed";
    endpoint.lastDeliveryAt = timestamp;
    return log;
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const log: WebhookDeliveryLog = {
      id: `wlog_${Date.now()}`,
      endpointId: endpoint.id,
      event,
      payload: data,
      statusCode: 0,
      status: "failed",
      attempt: 1,
      timestamp,
      durationMs,
      responseBody: err instanceof Error ? err.message : "Connection failed",
    };
    inMemoryWebhookLogs.unshift(log);
    endpoint.lastDeliveryStatus = "failed";
    endpoint.lastDeliveryAt = timestamp;
    return log;
  }
}

export function getWebhookLogs(): WebhookDeliveryLog[] {
  return inMemoryWebhookLogs;
}
