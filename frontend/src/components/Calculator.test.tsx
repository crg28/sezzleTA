import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/calculatorClient';
import { Calculator } from './Calculator';

function setup(calculate = vi.fn().mockResolvedValue(5)) {
  const user = userEvent.setup();
  render(<Calculator calculate={calculate} />);
  return { user, calculate };
}

const first = () => screen.getByLabelText('First number');
const second = () => screen.getByLabelText('Second number');
const submit = () => screen.getByRole('button', { name: 'Calculate' });

describe('Calculator', () => {
  it('sends a binary request and shows the formatted result', async () => {
    const { user, calculate } = setup(vi.fn().mockResolvedValue(0.1 + 0.2));
    await user.type(first(), '0.1');
    await user.type(second(), '0.2');
    await user.click(submit());

    expect(calculate).toHaveBeenCalledWith({ operation: 'add', a: 0.1, b: 0.2 });
    expect(await screen.findByRole('status')).toHaveTextContent('0.3');
  });

  it('uses the selected operation', async () => {
    const { user, calculate } = setup();
    await user.selectOptions(screen.getByLabelText('Operation'), 'multiply');
    await user.type(first(), '6');
    await user.type(second(), '7');
    await user.click(submit());
    expect(calculate).toHaveBeenCalledWith({ operation: 'multiply', a: 6, b: 7 });
  });

  it('hides the second operand for square root and omits b', async () => {
    const { user, calculate } = setup();
    await user.selectOptions(screen.getByLabelText('Operation'), 'sqrt');
    expect(screen.queryByLabelText('Second number')).not.toBeInTheDocument();
    await user.type(first(), '81');
    await user.click(submit());
    expect(calculate).toHaveBeenCalledWith({ operation: 'sqrt', a: 81 });
  });

  it('validates input without calling the API', async () => {
    const { user, calculate } = setup();
    await user.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('First number is required.');

    await user.type(first(), '1');
    await user.type(second(), 'abc');
    await user.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('Second number must be a valid number.');
    expect(calculate).not.toHaveBeenCalled();
  });

  it('shows API errors', async () => {
    const { user } = setup(
      vi.fn().mockRejectedValue(new ApiError('division_by_zero', "You can't divide by zero.")),
    );
    await user.selectOptions(screen.getByLabelText('Operation'), 'divide');
    await user.type(first(), '1');
    await user.type(second(), '0');
    await user.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent("You can't divide by zero.");
  });

  it('shows a generic message for unexpected failures', async () => {
    const { user } = setup(vi.fn().mockRejectedValue(new Error('boom')));
    await user.type(first(), '1');
    await user.type(second(), '1');
    await user.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it('disables the button while a request is in flight', async () => {
    let resolve!: (n: number) => void;
    const pending = new Promise<number>((r) => (resolve = r));
    const { user } = setup(vi.fn().mockReturnValue(pending));
    await user.type(first(), '1');
    await user.type(second(), '1');
    await user.click(submit());

    expect(submit()).toBeDisabled();
    resolve(2);
    expect(await screen.findByRole('status')).toHaveTextContent('2');
    expect(submit()).toBeEnabled();
  });

  it('clears inputs and messages', async () => {
    const { user } = setup();
    await user.type(first(), '1');
    await user.type(second(), '1');
    await user.click(submit());
    await screen.findByRole('status');

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(first()).toHaveValue('');
    expect(second()).toHaveValue('');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
