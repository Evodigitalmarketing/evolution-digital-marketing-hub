import { runAgent, type ChatTurn } from "../src/lib/agent/run";
import type { AgentState } from "../src/lib/agent/tools";

const scenarios: Record<string, string[]> = {
  beard_oil: [
    "I make beard oil in little glass dropper bottles. People keep them in the shower.",
    "what's the difference between gloss and matte?",
    "matte sounds nice. they're 30 ml bottles",
    "about 1000 to start, full colour, I stick them on by hand and I have an AI file",
    "Jordan, jordan@example.com",
    "yes that size is fine",
    "how much more for 2500?",
  ],
  big_run: [
    "We need 80,000 3x4 labels for frozen pizza boxes, full colour",
    "they go in the freezer at the grocery store. applied with a machine. yes we have files",
    "Sam at Niakwa Foods, sam@niakwa.ca",
  ],
  vague: [
    "how much are labels?",
    "candles",
    "8 oz jars, maybe 500, I need someone to design it",
    "can they be round?",
    "3 inch circle then. Priya 204-555-0199",
  ],
  change_mind: [
    "hi, 5000 labels 4x6 for our shipping boxes, black only, applied by hand, we have the file. Lee, lee@shipco.ca",
    "actually make it 10,000 and can they be removable?",
  ],
  offtopic: [
    "Do you sell Zebra printers? And can you write me a poem?",
  ],
};

for (const [name, turns] of Object.entries(scenarios)) {
  console.log(`\n===== ${name} =====`);
  let history: ChatTurn[] = [{ role: "assistant", text: "Hi, I'm the Label Source quote assistant. Tell me about your product and what the label is for, in your own words." }];
  let state: AgentState = { needs: { environment: [] } };
  for (const t of turns) {
    history.push({ role: "user", text: t });
    const t0 = Date.now();
    const out = await runAgent(history, state);
    state = out.state;
    history.push({ role: "assistant", text: out.reply });
    console.log(`> ${t}\n< ${out.reply}${out.quote ? `\n  [QUOTE ${out.quote.id} ${out.quote.price.ok ? "$" + out.quote.price.subtotal : "needs human: " + out.quote.price.reasons.join("; ")} — ${out.quote.recommendation.plainSummary}]` : ""}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}
