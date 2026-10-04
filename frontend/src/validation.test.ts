import { parseOperand } from './validation';

describe('parseOperand', () => {
  it.each([
    ['42', 42],
    ['  7  ', 7],
    ['-3.5', -3.5],
    ['+2', 2],
    ['.5', 0.5],
    ['5.', 5],
    ['1e3', 1000],
    ['2.5E-2', 0.025],
    ['0', 0],
  ])('accepts %j', (input, expected) => {
    expect(parseOperand(input, 'X')).toEqual({ ok: true, value: expected });
  });

  it.each(['', '   '])('rejects blank %j as required', (input) => {
    expect(parseOperand(input, 'Field')).toEqual({ ok: false, message: 'Field is required.' });
  });

  it.each(['abc', '1,5', '1 2', '0x10', 'Infinity', 'NaN', '--1', '1e', '.', '1.2.3'])(
    'rejects %j as invalid',
    (input) => {
      expect(parseOperand(input, 'Field')).toEqual({
        ok: false,
        message: 'Field must be a valid number.',
      });
    },
  );

  it('rejects numbers that overflow to Infinity', () => {
    expect(parseOperand('1e999', 'Field')).toEqual({ ok: false, message: 'Field is too large.' });
  });
});
