import { useState, type FormEvent } from 'react';
import { ApiError, calculate as defaultCalculate, type CalculateFn } from '../api/calculatorClient';
import { formatResult } from '../format';
import { OPERATIONS, isUnary, type CalculateRequest, type OperationId } from '../types';
import { parseOperand } from '../validation';

interface Props {
  /** Injectable so tests don't need a real server. */
  calculate?: CalculateFn;
}

export function Calculator({ calculate = defaultCalculate }: Props) {
  const [operation, setOperation] = useState<OperationId>('add');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setResult('');
    setError('');

    const firstNumber = parseOperand(a, 'First number');
    if (!firstNumber.ok) {
      setError(firstNumber.message);
      return;
    }
    const request: CalculateRequest = { operation, a: firstNumber.value };

    if (!isUnary(operation)) {
      const secondNumber = parseOperand(b, 'Second number');
      if (!secondNumber.ok) {
        setError(secondNumber.message);
        return;
      }
      request.b = secondNumber.value;
    }

    setLoading(true);
    try {
      const value = await calculate(request);
      setResult(formatResult(value));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setA('');
    setB('');
    setResult('');
    setError('');
  }

  return (
    <form className="card card-body shadow-sm" onSubmit={handleSubmit} noValidate>
      <div className="mb-3">
        <label htmlFor="operation" className="form-label">
          Operation
        </label>
        <select
          id="operation"
          className="form-select"
          value={operation}
          onChange={(e) => setOperation(e.target.value as OperationId)}
        >
          {OPERATIONS.map((op) => (
            <option key={op.id} value={op.id}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="a" className="form-label">
          First number
        </label>
        <input
          id="a"
          className="form-control"
          inputMode="decimal"
          autoComplete="off"
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </div>

      {!isUnary(operation) && (
        <div className="mb-3">
          <label htmlFor="b" className="form-label">
            Second number
          </label>
          <input
            id="b"
            className="form-control"
            inputMode="decimal"
            autoComplete="off"
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </div>
      )}

      <div className="d-flex gap-2 mb-3">
        <button type="submit" className="btn btn-primary flex-fill" disabled={loading}>
          Calculate
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result && (
        <div className="alert alert-success mb-0" role="status">
          Result: <strong>{result}</strong>
        </div>
      )}
      {error && (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
