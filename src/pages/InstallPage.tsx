import { useEffect, useState } from "react";
import {
  Apple,
  CheckCircle2,
  Download,
  MonitorSmartphone,
  Share,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { APK_FILENAME, APK_URL, APK_VERSION } from "../config";

/** The `beforeinstallprompt` event, which TypeScript's DOM lib does not model. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPage() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already running as an installed app?
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the prompt so our own button can fire it
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Smartphone className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Get the app
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            CooperWeb on your phone — papers and quizzes, straight from your home screen.
          </p>
        </div>
      </div>

      {installed && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          CooperWeb is already installed on this device.
        </div>
      )}

      {/* Android APK */}
      <div className="card mt-6 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Download className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Android — download the APK
          </h2>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            v{APK_VERSION}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          The full CooperWeb app, signed and ready to install. Works offline once you have
          opened it, and updates itself in the background.
        </p>
        {/* Hosted on GitHub Releases, so `download` does not apply (cross-origin);
            GitHub already serves release assets as an attachment. */}
        <a
          href={APK_URL}
          rel="noreferrer"
          className="btn-primary mt-4 w-full sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Download {APK_FILENAME}
        </a>
        <ol className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <li>
            <span className="font-semibold">1.</span> Tap the button — the download starts.
          </li>
          <li>
            <span className="font-semibold">2.</span> Open the downloaded file.
          </li>
          <li>
            <span className="font-semibold">3.</span> Android will ask permission to install
            from this source — allow it, then tap <span className="font-semibold">Install</span>.
          </li>
        </ol>
        <p className="mt-3 text-xs text-slate-400">
          Not from the Play Store yet, so Android shows a warning about unknown sources. That is
          expected for a directly downloaded app.
        </p>
      </div>

      {/* Install from the browser (PWA) */}
      <div className="card mt-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Or install straight from your browser
          </h2>
        </div>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          No download needed — this adds CooperWeb to your home screen and takes almost no space.
        </p>

        {deferred ? (
          <button onClick={install} className="btn-primary mt-4 w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Install CooperWeb
          </button>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <MonitorSmartphone className="h-4 w-4 shrink-0" aria-hidden />
                Android · Chrome
              </p>
              <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                Menu (⋮) → <span className="font-semibold">Add to Home screen</span>.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Apple className="h-4 w-4 shrink-0" aria-hidden />
                iPhone · Safari
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                Share <Share className="h-3.5 w-3.5 shrink-0" aria-hidden /> →
                <span className="font-semibold">Add to Home Screen</span>
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Same CooperWeb either way — your account, coins and progress follow you.
      </p>
    </div>
  );
}
