import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { getHealth } from '../api/client';

vi.mock('../api/client', () => ({ getHealth: vi.fn() }));

describe('connection screen', () => {
  it('shows loading and then a connected API', async () => {
    vi.mocked(getHealth).mockResolvedValue({ status: 'ok' });
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking...');
    expect(screen.getByRole('button')).toBeDisabled();
    expect(await screen.findByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('allows retrying a failed connection', async () => {
    vi.mocked(getHealth).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ status: 'ok' });
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the API');
    fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
    expect(await screen.findByText('Connected')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});