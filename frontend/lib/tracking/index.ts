/* eslint-disable @typescript-eslint/no-explicit-any -- third-party pixel globals have no types */
import { getConsent, REQUIRE_CONSENT } from "./consent";
import {
  PLATFORM_EVENT_NAMES,
  metaParams,
  snapParams,
  tiktokParams,
  type StoreEventName,
  type TrackData,
} from "./events";

const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const TIKTOK_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || "";
const SNAP_ID = process.env.NEXT_PUBLIC_SNAP_PIXEL_ID || "";

export const trackingConfigured = Boolean(META_ID || TIKTOK_ID || SNAP_ID);

const CLICK_IDS_KEY = "vitalize-click-ids";
const TIKTOK_SCRIPT = "https://analytics.tiktok.com/i18n/pixel/events.js";

type Pending = { name: StoreEventName; data: TrackData; eventId: string };
let started = false;
let pending: Pending[] = [];

export type TrackingPayload = {
  consent: boolean;
  source_url?: string;
  fbp?: string;
  fbc?: string;
  ttp?: string;
  ttclid?: string;
  sc_cookie1?: string;
  sc_click_id?: string;
};

export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function readStoredClickIds(): Record<string, string> {
  try {
    return JSON.parse(window.localStorage.getItem(CLICK_IDS_KEY) || "{}");
  } catch {
    return {};
  }
}

function captureClickIds() {
  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};
  const ttclid = params.get("ttclid");
  const scCid = params.get("ScCid") || params.get("sccid");
  const fbclid = params.get("fbclid");
  if (ttclid) found.ttclid = ttclid;
  if (scCid) found.sc_click_id = scCid;
  if (fbclid) found.fbclid = fbclid;
  if (!Object.keys(found).length) return;
  try {
    window.localStorage.setItem(
      CLICK_IDS_KEY,
      JSON.stringify({ ...readStoredClickIds(), ...found, fbclid_ts: String(Date.now()) }),
    );
  } catch {
    // Click ids are best-effort attribution data.
  }
}

export function getTrackingPayload(): TrackingPayload {
  if (!started || getConsent() !== "granted") return { consent: false };
  const stored = readStoredClickIds();
  const fbc =
    readCookie("_fbc") || (stored.fbclid ? `fb.1.${stored.fbclid_ts || Date.now()}.${stored.fbclid}` : undefined);
  const payload: TrackingPayload = {
    consent: true,
    source_url: `${window.location.origin}${window.location.pathname}`,
    fbp: readCookie("_fbp"),
    fbc,
    ttp: readCookie("_ttp"),
    ttclid: stored.ttclid,
    sc_cookie1: readCookie("_scid"),
    sc_click_id: stored.sc_click_id,
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as TrackingPayload;
}

function setupMeta() {
  const w = window as any;
  if (!w.fbq) {
    const fbq: any = (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    w.fbq = fbq;
    if (!w._fbq) w._fbq = fbq;
  }
  // Disable automatic form/button matching so no customer field is read by the pixel.
  w.fbq("set", "autoConfig", false, META_ID);
  w.fbq("init", META_ID);
  w.fbq("track", "PageView");
}

const TIKTOK_METHODS = [
  "page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group",
  "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent",
];

function setupTikTok() {
  const w = window as any;
  w.TiktokAnalyticsObject = "ttq";
  const ttq: any = (w.ttq = w.ttq || []);
  const defer = (target: any, method: string) => {
    target[method] = (...args: unknown[]) => target.push([method, ...args]);
  };
  TIKTOK_METHODS.forEach((method) => defer(ttq, method));
  ttq.instance = (id: string) => {
    const instance = ttq._i?.[id] || [];
    TIKTOK_METHODS.forEach((method) => defer(instance, method));
    return instance;
  };
  // Same bookkeeping as the official load(); the script tag itself is injected later.
  ttq._i = ttq._i || {};
  ttq._i[TIKTOK_ID] = [];
  ttq._i[TIKTOK_ID]._u = TIKTOK_SCRIPT;
  ttq._t = ttq._t || {};
  ttq._t[TIKTOK_ID] = Date.now();
  ttq._o = ttq._o || {};
  ttq._o[TIKTOK_ID] = {};
  ttq.page();
}

function setupSnap() {
  const w = window as any;
  if (!w.snaptr) {
    const snaptr: any = (...args: unknown[]) => {
      if (snaptr.handleRequest) snaptr.handleRequest(...args);
      else snaptr.queue.push(args);
    };
    snaptr.queue = [];
    w.snaptr = snaptr;
  }
  w.snaptr("init", SNAP_ID, {});
  w.snaptr("track", "PAGE_VIEW");
}

function inject(src: string) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function loadScripts() {
  if (META_ID) inject("https://connect.facebook.net/en_US/fbevents.js");
  if (TIKTOK_ID) inject(`${TIKTOK_SCRIPT}?sdkid=${encodeURIComponent(TIKTOK_ID)}&lib=ttq`);
  if (SNAP_ID) inject("https://sc-static.net/scevent.min.js");
}

function scheduleScriptLoad() {
  const run = () => {
    const w = window as any;
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(loadScripts, { timeout: 4000 });
    else window.setTimeout(loadScripts, 2500);
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}

function dispatch({ name, data, eventId }: Pending) {
  const w = window as any;
  if (META_ID && w.fbq) {
    w.fbq("track", PLATFORM_EVENT_NAMES.meta[name], metaParams(data), { eventID: eventId });
  }
  if (TIKTOK_ID && w.ttq) {
    w.ttq.track(PLATFORM_EVENT_NAMES.tiktok[name], tiktokParams(data), { event_id: eventId });
  }
  if (SNAP_ID && w.snaptr) {
    w.snaptr("track", PLATFORM_EVENT_NAMES.snap[name], snapParams(data, eventId, name === "Purchase"));
  }
}

export function startTracking() {
  if (started || typeof window === "undefined" || !trackingConfigured) return;
  if (getConsent() !== "granted") return;
  started = true;
  captureClickIds();
  if (META_ID) setupMeta();
  if (TIKTOK_ID) setupTikTok();
  if (SNAP_ID) setupSnap();
  const queued = pending;
  pending = [];
  queued.forEach(dispatch);
  scheduleScriptLoad();
}

export function hasStartedTracking(): boolean {
  return started;
}

/** Fires a browser event. Purchase must pass the order id so it matches the server-side event. */
export function trackEvent(name: StoreEventName, data: TrackData, eventId: string = newEventId()): string {
  if (typeof window === "undefined" || !trackingConfigured) return eventId;
  const event = { name, data, eventId };
  if (started) {
    dispatch(event);
  } else if (getConsent() !== "denied" && (REQUIRE_CONSENT || getConsent() === "granted")) {
    // Buffer until the visitor decides; dropped if they decline.
    if (pending.length < 20) pending.push(event);
  }
  return eventId;
}

export function discardPendingEvents() {
  pending = [];
}
