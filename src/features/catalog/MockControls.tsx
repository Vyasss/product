import { Button } from '../../components/ui/Button';
import type { MockControls as MockControlsApi } from '../../data/mockControls';

export interface MockControlsProps {
  controls: MockControlsApi;
  onReload: () => void;
}

/**
 * An on-page switch for the simulated failure: the next load of the mock service fails with a
 * 500, the error state appears, and its Retry recovers. On by default with the mock service
 * (VITE_ENABLE_MOCK_CONTROLS=false hides it); `?mockFail=1` in the URL does the same.
 */
export function MockControls({ controls, onReload }: MockControlsProps) {
  return (
    <aside
      aria-label="Mock API controls"
      className="mt-3 flex justify-end"
    >
      <Button
        className="min-h-9 bg-card"
        onClick={() => {
          controls.failNext(1);
          onReload();
        }}
      >
        Simulate API failure
      </Button>
    </aside>
  );
}
