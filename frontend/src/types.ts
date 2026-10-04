export type OperationId =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'percent'
  | 'sqrt';

export const OPERATIONS: { id: OperationId; label: string }[] = [
  { id: 'add', label: '+  Add' },
  { id: 'subtract', label: '−  Subtract' },
  { id: 'multiply', label: '×  Multiply' },
  { id: 'divide', label: '÷  Divide' },
  { id: 'power', label: 'xʸ  Power' },
  { id: 'percent', label: '%  Percent of' },
  { id: 'sqrt', label: '√  Square root' },
];

/** Square root is the only operation that takes a single number. */
export function isUnary(operation: OperationId): boolean {
  return operation === 'sqrt';
}

export interface CalculateRequest {
  operation: OperationId;
  a: number;
  b?: number;
}
