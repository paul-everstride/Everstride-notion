import "server-only";
import crypto from "crypto";

/**
 * Mint a short-lived signed token that the seasonal planner (planner.everstride.fit)
 * verifies to authenticate the coach. The planner derives the coach id from this
 * token, so a coach can only ever access their own athletes and plans.
 *
 * Requires PLANNER_SHARED_SECRET to be set to the SAME value on both this app and
 * the planner service. If unset, returns "" (planner falls back to legacy mode).
 */
const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function b64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signPlannerToken(coachId: string): string {
  const secret = process.env.PLANNER_SHARED_SECRET;
  if (!secret) return "";
  const payload = JSON.stringify({ coach_id: coachId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
  const body = b64url(Buffer.from(payload));
  const sig = b64url(crypto.createHmac("sha256", secret).update(body).digest());
  return `${body}.${sig}`;
}
