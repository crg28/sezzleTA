import { ApiError, calculate } from './calculatorClient';

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('calculate', () => {
  it('POSTs the request and returns the result', async () => {
    mockFetch(async () => json({ result: 5 }));
    await expect(calculate({ operation: 'add', a: 2, b: 3 })).resolves.toBe(5);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/v1/calculate');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ operation: 'add', a: 2, b: 3 });
  });

  it('maps known error codes to friendly messages', async () => {
    mockFetch(async () => json({ error: { code: 'division_by_zero', message: 'raw' } }, 422));
    await expect(calculate({ operation: 'divide', a: 1, b: 0 })).rejects.toMatchObject({
      code: 'division_by_zero',
      message: "You can't divide by zero.",
    });
  });

  it('falls back to the server message for unknown codes', async () => {
    mockFetch(async () => json({ error: { code: 'new_code', message: 'Server says no' } }, 400));
    await expect(calculate({ operation: 'add', a: 1, b: 1 })).rejects.toMatchObject({
      code: 'new_code',
      message: 'Server says no',
    });
  });

  it('reports a network failure', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(calculate({ operation: 'add', a: 1, b: 1 })).rejects.toMatchObject({
      code: 'network_error',
    });
  });

  it('reports a non-JSON response', async () => {
    mockFetch(async () => new Response('<html>502</html>', { status: 502 }));
    const err = await calculate({ operation: 'add', a: 1, b: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('unexpected_response');
  });

  it('reports a success payload without a numeric result', async () => {
    mockFetch(async () => json({ result: 'five' }));
    await expect(calculate({ operation: 'add', a: 1, b: 1 })).rejects.toMatchObject({
      code: 'unexpected_response',
    });
  });

  it('handles an error status with an unexpected body shape', async () => {
    mockFetch(async () => json({}, 500));
    await expect(calculate({ operation: 'add', a: 1, b: 1 })).rejects.toMatchObject({
      code: 'unexpected_response',
      message: 'Something went wrong.',
    });
  });
});
