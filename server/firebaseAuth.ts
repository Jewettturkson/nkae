// Firebase Auth: stateless bearer-token verification, replacing Replit Auth.
// Client sends a Firebase ID token in the Authorization header; we verify it
// with firebase-admin and expose the same req.user.claims.sub shape the
// routes already consume, so no route changes are needed.
import type { Express, RequestHandler } from "express";
import { initializeApp, cert, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { storage } from "./storage";

// A bad or missing credential must never crash the server. If init fails we
// log loudly, boot anyway, and auth endpoints return 503 until it's fixed.
let adminReady = false;

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    adminReady = true;
    return;
  }
  try {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (b64) {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const json = JSON.parse(decoded);
      initializeApp({ credential: cert(json) });
    } else {
      initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID });
    }
    adminReady = true;
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error(
      "CONFIG ERROR: Firebase Admin failed to initialize. " +
        "FIREBASE_SERVICE_ACCOUNT_BASE64 must be the base64 of the service-account JSON " +
        "(run: base64 -i service-account.json | tr -d '\\n'). " +
        "The server is running, but auth endpoints return 503 until this is fixed.",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function setupAuth(_app: Express) {
  initFirebaseAdmin();
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    if (!adminReady) {
      return res.status(503).json({ message: "Auth is not configured on the server. Check FIREBASE_SERVICE_ACCOUNT_BASE64." });
    }
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = await getAuth().verifyIdToken(token);
    // First-seen users are created on the fly so /api/auth/user always resolves.
    const existing = await storage.getUser(decoded.uid);
    if (!existing) {
      await storage.upsertUser({
        id: decoded.uid,
        email: decoded.email ?? null,
        firstName: decoded.name ? decoded.name.split(" ")[0] : null,
        lastName: decoded.name ? decoded.name.split(" ").slice(1).join(" ") || null : null,
        profileImageUrl: decoded.picture ?? null,
      } as any);
    }
    req.user = { claims: { sub: decoded.uid, email: decoded.email } };
    return next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
