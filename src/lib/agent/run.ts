import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "./prompt";
import { TOOLS, runTool, missingFields, type AgentState } from "./tools";
import type { Quote } from "../quotes/model";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AgentReply {
  reply: string;
  state: AgentState;
  quote?: Quote;
  missing: string[];
}

export const agentEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_TOOL_ROUNDS = 6;

export async function runAgent(history: ChatTurn[], state: AgentState, channel: Quote["channel"] = "web"): Promise<AgentReply> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Conversation history is plain text turns; the job record travels as state and
  // is shown to the model each turn so it never has to remember tool results.
  const recordNote = `Current job record (from update_needs): ${JSON.stringify(state.needs)}\nStill missing: ${missingFields(state.needs).join("; ") || "nothing"}${state.quoteId ? `\nLatest quote issued: ${state.quoteId}` : ""}`;

  const messages: Anthropic.MessageParam[] = history
    .filter((t) => t.text.trim())
    .slice(-30)
    .map((t) => ({ role: t.role, content: t.text }));
  // The API needs the first message to be from the user.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) messages.push({ role: "user", content: "Hi" });

  let current = state;
  let quote: Quote | undefined;
  const replyParts: string[] = [];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system: [
        { type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } },
        { type: "text", text: recordNote },
      ],
      tools: TOOLS,
      messages,
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (text) replyParts.push(text);

    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || uses.length === 0) break;

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      try {
        const out = await runTool(u.name, (u.input ?? {}) as Record<string, unknown>, current, channel);
        current = out.state;
        if (out.quote) quote = out.quote;
        results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify(out.result) });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: u.id, content: JSON.stringify({ error: (e as Error).message }), is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }

  return {
    reply: replyParts.join("\n\n") || "Sorry, I lost my train of thought there. Could you say that again?",
    state: current,
    quote,
    missing: missingFields(current.needs),
  };
}
