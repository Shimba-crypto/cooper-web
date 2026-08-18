export const PAYMENT_MERCHANT_NUMBER = "0975876361";
export const JOHNWEB_URL = "https://johnweb-qncu.onrender.com";
export const JOHNWEB_INVITE_URL = "https://johnweb-qncu.onrender.com/invite/92ms0tklymzo7m6c";
export const API_URL = import.meta.env.VITE_API_URL ?? "https://cooper-web.onrender.com";

// Android app. The APK is hosted on GitHub Releases, not Firebase Hosting —
// Hosting rejects executable files on the Spark (free) plan.
// APK_RELEASE_TAG is the git tag the asset hangs off; bump it every release.
export const APK_RELEASE_TAG = "v1.0.1";
export const APK_VERSION = "1.0.1";
export const APK_FILENAME = "cooperweb.apk";
export const APK_URL = `https://github.com/Shimba-crypto/cooper-web/releases/download/${APK_RELEASE_TAG}/${APK_FILENAME}`;

// Auther — the identity provider for every Shimba app. One account signs you in
// everywhere. Login runs server-side through the API (GET /api/auth/sso), so the
// Auther token never reaches the browser; this URL is only for direct links.
export const AUTHER_URL = import.meta.env.VITE_AUTHER_URL ?? "https://auther-zblr.onrender.com";
