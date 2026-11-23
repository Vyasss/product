import { Button } from '../../components/ui/Button';
import type { MockControls as MockControlsApi } from '../../data/mockControls';

export interface MockControlsProps {
  controls: MockControlsApi;
  onReload: () => void;
}

/**
 * Add-on, rendered only when VITE_ENABLE_MOCK_CONTROLS is on: lets a reviewer trigger the
 * simulated 500 without editing the URL or env.
 */
export function MockControls({ controls, onReload }: MockControlsProps) {
  return (
    <aside
      aria-label="Mock API controls"
      className="fixed right-4 bottom-4 z-40 flex max-w-xs flex-col gap-2 rounded-card border border-line bg-warn-soft p-3 text-sm text-warn-ink shadow-raised"
    >
      <p className="font-semibold">Mock API (development aid)</p>
      <Button
        onClick={() => {
          controls.failNext(1);
          onReload();
        }}
      >
        Reload with a simulated 500
      </Button>
      <Button onClick={onReload}>Reload normally</Button>
    </aside>
  );
}
