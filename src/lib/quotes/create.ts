import type { Needs } from "../advisor/needs";
import { recommend } from "../advisor/recommend";
import { getRateCard, priceQuote } from "../pricing/engine";
import { newQuoteId, type Quote } from "./model";
import { saveQuote } from "./store";
import { notifyOwner } from "../notify/email";

export async function createQuote(needs: Needs, channel: Quote["channel"] = "web"): Promise<Quote> {
  const card = getRateCard();
  const recommendation = recommend(needs);
  const price = priceQuote(recommendation.spec, card);
  const now = new Date();
  const expires = new Date(now.getTime() + card.limits.quoteValidDays * 86400000);
  const quote: Quote = {
    id: newQuoteId(),
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: price.ok ? "quoted" : "needs_human",
    channel,
    needs,
    recommendation,
    price,
    events: [
      { at: now.toISOString(), type: "created", detail: `channel=${channel} rateCard=${card.version}` },
      price.ok
        ? { at: now.toISOString(), type: "priced", detail: `$${price.subtotal} for ${recommendation.spec.quantity}` }
        : { at: now.toISOString(), type: "escalated", detail: price.reasons.join("; ") },
    ],
  };
  await saveQuote(quote);
  void notifyOwner(quote);
  return quote;
}
