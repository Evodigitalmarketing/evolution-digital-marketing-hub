export function parseQuantity(s: string): number | undefined {
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  if (m[2]) n *= 1000;
  return Math.round(n);
}

export function parseSize(s: string): { w: number; h: number } | undefined {
  const m = s.replace(/["”]/g, "").match(/(\d+(?:\.\d+)?)\s*(?:x|×|by|\*)\s*(\d+(?:\.\d+)?)/i);
  if (!m) return undefined;
  return { w: parseFloat(m[1]), h: parseFloat(m[2]) };
}
