import { NextResponse } from "next/server";
import { agentEnabled, runAgent, type ChatTurn } from "@/lib/agent/run";
import type { AgentState } from "@/lib/agent/tools";

export const maxDuration = 60;

// GET: is the AI conversation available? (false = the page uses the scripted flow)
export async function GET() {
  return NextResponse.json({ ai: agentEnabled() });
}

export async function POST(req: Request) {
  if (!agentEnabled()) return NextResponse.json({ error: "ai_disabled" }, { status: 503 });
  let body: { history?: ChatTurn[]; state?: AgentState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const history = (body.history ?? []).filter(
    (t) => (t.role === "user" || t.role === "assistant") && typeof t.text === "string",
  ).map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }));
  const state: AgentState = {
    needs: { environment: [], ...(body.state?.needs ?? {}) },
    quoteId: body.state?.quoteId,
  };
  if (!Array.isArray(state.needs.environment)) state.needs.environment = [];
  try {
    const out = await runAgent(history, state, "web");
    return NextResponse.json(out);
  } catch (e) {
    console.error("agent error", e);
    return NextResponse.json({ error: "agent_failed" }, { status: 502 });
  }
}
