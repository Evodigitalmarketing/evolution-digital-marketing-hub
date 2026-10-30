import type { Needs } from "../advisor/needs";
import type { Recommendation } from "../advisor/recommend";
import type { PriceResult } from "../pricing/types";

export type QuoteStatus =
  | "quoted" // price shown, waiting on artwork
  | "needs_human" // out of range, a person quotes
  | "artwork_uploaded" // preflight ran
  | "proof_approved" // customer approved proof
  | "paid" // checkout complete (stub in demo)
  | "expired";

export interface ArtworkRecord {
  fileName: string;
  mime: string;
  bytes: number;
  storedPath?: string; // local demo path or object-storage key
  dataUrl?: string; // demo only: inline preview for raster files
  pixelWidth?: number;
  pixelHeight?: number;
  effectiveDpi?: number; // at label size
  preflight: { ok: boolean; issues: string[]; notes: string[] };
  uploadedAt: string;
}

export interface QuoteEvent {
  at: string;
  type: string;
  detail?: string;
}

export interface Quote {
  id: string;
  createdAt: string;
  expiresAt: string;
  status: QuoteStatus;
  channel: "web" | "sms" | "email";
  needs: Needs;
  recommendation: Recommendation;
  price: PriceResult;
  artwork?: ArtworkRecord;
  proof?: { approvedAt: string; fileHash: string; rightsConfirmed: boolean };
  events: QuoteEvent[];
}

export function newQuoteId() {
  // Short, human-readable: LS-7K3M2Q
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `LS-${s}`;
}

export function isExpired(q: Quote) {
  return new Date(q.expiresAt).getTime() < Date.now();
}
