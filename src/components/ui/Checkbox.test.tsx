import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './Checkbox';

function Controlled() {
  const [checked, setChecked] = useState(false);
  return <Checkbox label="In stock only" checked={checked} onChange={(event) => setChecked(event.target.checked)} />;
}

describe('Checkbox', () => {
  it('toggles with Space and with Enter', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const box = screen.getByRole('checkbox', { name: 'In stock only' });

    await user.tab();
    expect(box).toHaveFocus();
    await user.keyboard(' ');
    expect(box).toBeChecked();
    await user.keyboard('{Enter}');
    expect(box).not.toBeChecked();
    await user.keyboard('{Enter}');
    expect(box).toBeChecked();
  });

  it('lets a caller handle Enter itself', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Books" onKeyDown={(event) => event.preventDefault()} />);
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('checkbox', { name: 'Books' })).not.toBeChecked();
  });
});
