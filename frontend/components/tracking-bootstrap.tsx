"use client";

import { useEffect, useState } from "react";
import { CONSENT_EVENT, getConsent, REQUIRE_CONSENT, setConsent } from "@/lib/tracking/consent";
import { discardPendingEvents, hasStartedTracking, startTracking, trackingConfigured } from "@/lib/tracking";

export function TrackingBootstrap() {
  const [needsDecision, setNeedsDecision] = useState(false);

  useEffect(() => {
    if (!trackingConfigured) return;
    const sync = () => {
      const state = getConsent();
      if (state === "granted") startTracking();
      if (state === "denied") {
        discardPendingEvents();
        // Pixels cannot be unloaded; reload so a revoked choice takes effect immediately.
        if (hasStartedTracking()) window.location.reload();
      }
      setNeedsDecision(REQUIRE_CONSENT && state === null);
    };
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!needsDecision) return null;
  return (
    <div className="consent-banner" role="dialog" aria-label="إعدادات الإعلانات">
      <p>
        كنستعملو كوكيز وأدوات إعلانية (Meta, TikTok, Snapchat) باش نقيسو الإعلانات ونحسنو التجربة. المعلومات الشخصية
        ما كتبعثش من المتصفح. تقدر تقبل ولا ترفض.
      </p>
      <div className="consent-actions">
        <button className="button" onClick={() => setConsent("granted")}>موافق</button>
        <button className="button secondary" onClick={() => setConsent("denied")}>رفض</button>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  if (!trackingConfigured || !REQUIRE_CONSENT) return null;
  return (
    <button className="text-button" onClick={() => setConsent("unset")}>
      إعدادات الكوكيز والإعلانات
    </button>
  );
}
