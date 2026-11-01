export const STATUS: Record<string, { label: string; cls: string }> = {
  quoted: { label: "Quoted", cls: "bg-cream text-navy" },
  needs_human: { label: "Needs you", cls: "bg-[#f3c7b8] text-[#7a2a14]" },
  artwork_uploaded: { label: "Artwork in", cls: "bg-[#dfe9ff] text-[#21407a]" },
  proof_approved: { label: "Proof approved", cls: "bg-[#e9f3c0] text-[#4b5a00]" },
  paid: { label: "Paid", cls: "bg-lime text-navy" },
  expired: { label: "Expired", cls: "bg-cream-2 text-ink-soft" },
};
