import React, { useState, useEffect, useRef } from "react";
import { Wrench, TriangleAlert, Clock, X } from "lucide-react";
import { cn } from "../lib/utils";
import { API_URL } from "../config/appConfig";

const MaintenanceIndicator = ({ darkMode = true }) => {
  const [data, setData] = useState(null); // raw API response
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  // ── Auth check ──────────────────────────────────────────────────────────
  const loggedInUser = (() => {
    try {
      const stored =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/system/maintenance/status`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
      // silently fail – don't break the header
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Derived values ───────────────────────────────────────────────────────
  const isActive = data?.isMaintenanceMode && !data?.canBypass;
  const isEmergency = data?.maintenanceType === "emergency";

  const formatETA = (iso) => {
    if (!iso) return null;
    try {
      const date = new Date(iso);
      const diffMs = date - new Date();
      if (diffMs < -5 * 60_000) return null; // clearly past – hide
      const diffMins = Math.ceil(diffMs / 60_000);
      const diffHrs = Math.ceil(diffMs / 3_600_000);
      if (diffMins <= 1) return "Σύντομα";
      if (diffMins <= 60) return `~${diffMins} λεπτά`;
      if (diffHrs <= 23) return `~${diffHrs} ώρες`;
      return date.toLocaleString("el-GR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return null;
    }
  };

  // Don't render if no active maintenance or user is not logged in
  if (!isActive || !loggedInUser) return null;

  const eta = formatETA(data?.estimatedCompletion);

  // Colours
  const iconColour = isEmergency
    ? darkMode
      ? "text-red-400 hover:text-red-300"
      : "text-red-500 hover:text-red-600"
    : darkMode
      ? "text-amber-400 hover:text-amber-300"
      : "text-amber-500 hover:text-amber-600";

  const popoverBg = darkMode
    ? "bg-zinc-900 border-zinc-700 text-zinc-100"
    : "bg-white border-slate-200 text-slate-900";

  const badgeCls = isEmergency
    ? darkMode
      ? "bg-red-500/15 text-red-400 border border-red-500/30"
      : "bg-red-50 text-red-600 border border-red-200"
    : darkMode
      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
      : "bg-amber-50 text-amber-600 border border-amber-200";

  const subtextCls = darkMode ? "text-zinc-400" : "text-slate-500";

  return (
    <div className="relative flex items-center">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Κατάσταση συντήρησης"
        className={cn(
          "relative w-8 h-8 flex items-center justify-center rounded-full transition-colors",
          darkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100",
          iconColour,
        )}
      >
        {isEmergency ? (
          <TriangleAlert className="w-[18px] h-[18px]" />
        ) : (
          <Wrench className="w-[18px] h-[18px]" />
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className={cn(
            "absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-2xl z-[9999] p-4",
            popoverBg,
          )}
          style={{ backdropFilter: "blur(12px)" }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-s font-semibold py-0.5">
              {isEmergency
                ? "Επείγουσα συντήρηση"
                : "Προγραμματισμένη συντήρηση"}
            </span>
          </div>

          {/* Message */}
          {data?.maintenanceMessage && (
            <p className={cn("text-sm leading-relaxed mb-3", subtextCls)}>
              {data.maintenanceMessage}
            </p>
          )}

          {/* ETA row */}
          {eta && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isEmergency
                  ? darkMode
                    ? "bg-red-500/10 text-red-400"
                    : "bg-red-50 text-red-600"
                  : darkMode
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-amber-50 text-amber-600",
              )}
            >
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                Εκτιμώμενη αποκατάσταση:{" "}
                <strong className="font-semibold">{eta}</strong>
              </span>
            </div>
          )}

          {/* Footer note */}
          <p className={cn("text-[11px] mt-3 leading-relaxed", subtextCls)}>
            Ορισμένες λειτουργίες ενδέχεται να μην λειτουργούν σωστά κατά τη
            διάρκεια της συντήρησης.
          </p>
        </div>
      )}
    </div>
  );
};

export default MaintenanceIndicator;
