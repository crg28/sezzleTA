/**
 * Hides binary floating point noise (0.1 + 0.2 → 0.30000000000000004)
 * by rounding to 12 significant digits. The API still returns the raw value.
 */
export function formatResult(value: number): string {
  return String(Number(value.toPrecision(12)));
}
