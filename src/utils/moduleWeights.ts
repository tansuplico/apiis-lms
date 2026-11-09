// src/utils/moduleWeights.ts

export interface ModuleWeightEntry {
  moduleId: number;
  weight: number | null;
}

/**
 * Turns the Weight modal's inputs (keyed by module number, "" = auto) into the
 * payload for PUT /courses/:id/modules/weights.
 *
 * Blank modules get an equal share of whatever the explicit weights leave over.
 * Shares are whole hundredths and the leftover hundredths go to the first blank
 * modules, so the total is exactly 100 (3 blanks -> 33.34, 33.33, 33.33).
 * If the explicit weights already use up 100, blank modules get 0.
 */
export function buildModuleWeightsPayload(
  modules: { id: number; number: number }[],
  weights: Record<number, string>,
): ModuleWeightEntry[] {
  const parsed = (moduleNumber: number): number | null => {
    const raw = (weights[moduleNumber] ?? "").trim();
    if (raw === "") return null;
    const value = parseFloat(raw);
    return Number.isNaN(value) ? null : value;
  };

  const explicitSum = modules.reduce(
    (sum, mod) => sum + (parsed(mod.number) ?? 0),
    0,
  );
  const blankCount = modules.filter(
    (mod) => parsed(mod.number) === null,
  ).length;

  // Work in hundredths so floating-point drift can't leak into the total.
  const remainingCents = Math.max(0, Math.round((100 - explicitSum) * 100));
  const baseCents =
    blankCount > 0 ? Math.floor(remainingCents / blankCount) : 0;
  let extraCents = blankCount > 0 ? remainingCents - baseCents * blankCount : 0;

  return modules.map((mod) => {
    const explicit = parsed(mod.number);
    if (explicit !== null) return { moduleId: mod.id, weight: explicit };

    const cents = baseCents + (extraCents > 0 ? 1 : 0);
    if (extraCents > 0) extraCents--;
    return { moduleId: mod.id, weight: cents / 100 };
  });
}
