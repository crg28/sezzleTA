export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

// Plain decimal or scientific notation. Stricter than Number(), which would
// accept '', ' ', '0x10' and 'Infinity'.
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

export function parseOperand(raw: string, fieldName: string): ParseResult {
  const text = raw.trim();
  if (text === '') {
    return { ok: false, message: `${fieldName} is required.` };
  }
  if (!NUMBER_PATTERN.test(text)) {
    return { ok: false, message: `${fieldName} must be a valid number.` };
  }
  const value = Number(text);
  if (!Number.isFinite(value)) {
    return { ok: false, message: `${fieldName} is too large.` };
  }
  return { ok: true, value };
}
