import { formatResult } from './format';

describe('formatResult', () => {
  it('removes floating point noise', () => {
    expect(formatResult(0.1 + 0.2)).toBe('0.3');
  });
  it('keeps integers and negatives intact', () => {
    expect(formatResult(42)).toBe('42');
    expect(formatResult(-1.5)).toBe('-1.5');
    expect(formatResult(0)).toBe('0');
  });
  it('keeps precision for repeating decimals', () => {
    expect(formatResult(1 / 3)).toBe('0.333333333333');
  });
  it('handles very large values', () => {
    expect(formatResult(1e21)).toBe('1e+21');
  });
});
