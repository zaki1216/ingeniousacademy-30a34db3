// Browser-side helpers for Academy phone notifications.
import {
  getPushConfig,
  registerPushDevice,
  removePushDevice,
} from "@/lib/api/notifications.functions";

export type PushState = "unsupported" | "default" | "granted" | "denied";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushState(): PushState {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission as PushState;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return window.btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/push-sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android device";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "Device";
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  const { publicKey } = await getPushConfig();
  if (!publicKey) return { ok: false, reason: "not-configured" };

  const reg = await getRegistration();
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    });
  }

  await registerPushDevice({
    data: {
      endpoint: sub.endpoint,
      p256dh: bufToB64url(sub.getKey("p256dh")),
      auth: bufToB64url(sub.getKey("auth")),
      userAgent: navigator.userAgent.slice(0, 400),
      label: deviceLabel(),
    },
  });

  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await removePushDevice({ data: { endpoint: sub.endpoint } }).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
}

export async function isPushEnabledHere(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}
