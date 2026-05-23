import React, { useEffect, useState } from "react";
import {
  Construction,
  Unplug,
  RefreshCw,
  Clock,
  ArrowRight,
} from "lucide-react";
import { API_URL } from "../config/appConfig";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const Maintenance = () => {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useState(() => {
    const saved = localStorage.getItem("publicPageTheme");
    return saved ? JSON.parse(saved) : true;
  });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/system/maintenance/status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setInfo(data);
    } catch (err) {
      console.error("[MAINTENANCE PAGE] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMousePos({
      x: window.innerWidth * 0.9,
      y: window.innerHeight * 0.9,
    });

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Redirect back when maintenance is lifted
  useEffect(() => {
    if (info && !info.isMaintenanceMode && !loading) {
      window.location.href = "/";
    }
  }, [info, loading]);

  // ── Derived from config ──────────────────────────────────────────────
  const isEmergency = info?.maintenanceType === "emergency";
  const message = info?.maintenanceMessage || info?.reason || "";

  const formatETA = (est) => {
    if (!est) return null;
    try {
      const date = new Date(est);
      if (isNaN(date.getTime())) return null;

      const now = new Date();
      const diffMs = date - now;

      // Only hide if clearly past (>5 min ago)
      if (diffMs < -5 * 60000) return null;

      const diffMins = Math.ceil(diffMs / 60000);
      const diffHrs = Math.ceil(diffMs / 3600000);

      if (diffMins <= 1) return "Σύντομα";
      if (diffMins <= 60) return `~${diffMins} λεπτά`;
      if (diffHrs <= 23) return `~${diffHrs} ώρες`;

      // More than a day — show full date + time
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

  const eta = !loading ? formatETA(info?.estimatedCompletion) : "...";

  // ── Theme tokens driven by maintenance type ──────────────────────────
  const accent = isEmergency
    ? {
        glow: "bg-red-500",
        badge: darkMode
          ? "border-red-500/50 text-red-400 bg-red-500/5"
          : "border-red-200 text-red-600 bg-red-50",
        icon: darkMode
          ? "bg-red-500/10 text-red-400"
          : "bg-red-50 text-red-600",
        bar: "from-red-500 via-red-400 to-orange-500",
        label: "Έκτακτη Συντήρηση",
        button:
          "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200",
      }
    : {
        glow: "bg-blue-500",
        badge: darkMode
          ? "border-amber-500/50 text-amber-400 bg-amber-500/5"
          : "border-amber-200 text-amber-600 bg-amber-50",
        icon: darkMode
          ? "bg-blue-500/10 text-blue-400"
          : "bg-blue-50 text-blue-600",
        bar: "from-blue-500 via-blue-400 to-indigo-500",
        label: "Προγραμματισμένη Συντήρηση",
        button:
          "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200",
      };

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-hidden",
        darkMode ? "bg-zinc-950 text-zinc-100" : "bg-gray-50 text-slate-900",
      )}
    >
      {/* Background dot grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${darkMode ? "#27272a" : "#e2e8f0"} 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Ambient glow — changes colour with maintenance type */}
      <div
        className={cn(
          "absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-10 blur-[120px] z-0 transition-colors duration-700",
          accent.glow,
        )}
      />
      <div
        className={cn(
          "absolute w-[40%] h-[40%] rounded-full opacity-10 blur-[120px] z-0 pointer-events-none transition-colors duration-700",
          accent.glow,
        )}
        style={{
          left: `${mousePos.x}px`,
          top: `${mousePos.y}px`,
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center">
        <a
          href="/home"
          className="flex items-center gap-2 group no-underline hover:no-underline"
        >
          <img
            src="/logo-transparent.png"
            alt="GradeBook Logo"
            className="w-9 h-9 object-contain transition-transform group-hover:scale-105"
          />
          <span
            className={cn(
              "text-2xl font-serif font-bold tracking-tight",
              darkMode ? "text-white" : "text-slate-900",
            )}
          >
            GradeBook
          </span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-2xl space-y-4">
          {/* ── Hero Card ── */}
          <Card
            className={cn(
              "border-none shadow-none bg-transparent overflow-hidden",
            )}
          >
            <CardContent className="p-8 md:p-12 text-center space-y-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div
                  className={cn(
                    "w-20 h-20 rounded-3xl flex items-center justify-center",
                    accent.icon,
                    isEmergency
                      ? "animate-pulse"
                      : "animate-[pulse_3s_ease-in-out_infinite]",
                  )}
                >
                  {isEmergency ? (
                    <Unplug className="w-10 h-10" />
                  ) : (
                    <Construction className="w-10 h-10" />
                  )}
                </div>
              </div>

              {/* Badge + Title + Message */}
              <div className="space-y-3">
                <h1
                  className={cn(
                    "text-3xl md:text-5xl font-serif font-bold tracking-tight",
                    darkMode ? "text-white" : "text-slate-900",
                  )}
                >
                  {isEmergency
                    ? "Επείγουσα συντήρηση"
                    : "Προγραμματισμένη συντήρηση"}
                </h1>

                {!loading &&
                  (message ? (
                    <p
                      className={cn(
                        "text-base md:text-lg max-w-lg mx-auto leading-relaxed",
                        darkMode ? "text-zinc-300" : "text-slate-600",
                      )}
                    >
                      {message}
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "text-base md:text-lg max-w-lg mx-auto leading-relaxed",
                        darkMode ? "text-zinc-400" : "text-slate-500",
                      )}
                    >
                      {isEmergency
                        ? "Αντιμετωπίζουμε έκτακτο πρόβλημα. Εργαζόμαστε για άμεση επίλυση."
                        : "Εκτελούμε εργασίες αναβάθμισης για να σας προσφέρουμε την καλύτερη εμπειρία."}
                    </p>
                  ))}

                {/* ETA inside the hero */}
                {!loading && (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Clock
                      className={cn(
                        "w-4 h-4",
                        darkMode ? "text-zinc-500" : "text-slate-400",
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        darkMode ? "text-zinc-400" : "text-slate-500",
                      )}
                    >
                      Εκτιμώμενη αποκατάσταση:&nbsp;
                      <span
                        className={cn(
                          "font-semibold",
                          darkMode ? "text-zinc-200" : "text-slate-700",
                        )}
                      >
                        {eta ?? "Σύντομα"}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* CTA Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => window.location.reload()}
                  className={cn(
                    "rounded-full px-8 h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]",
                    accent.button,
                  )}
                >
                  <RefreshCw
                    className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
                  />
                  Δοκιμάστε Ξανά
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="rounded-full px-8 h-12 text-base font-semibold border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 bg-transparent transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <a
                    href="/home"
                    className="hover:no-underline flex items-center"
                  >
                    Αρχική Σελίδα
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full p-6 text-center">
        <p
          className={cn(
            "text-xs",
            darkMode ? "text-zinc-600" : "text-slate-400",
          )}
        >
          © {new Date().getFullYear()} GradeBook
        </p>
      </footer>
    </div>
  );
};

export default Maintenance;
