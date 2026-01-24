import { V86Status } from '../lib/v86';
import './VMManager.css';

interface VMManagerProps {
  status: V86Status;
  onStart: () => void;
  onStop: () => void;
  onSave: () => void;
  onRestore: () => void;
}

export function VMManager({ status, onStart, onStop, onSave, onRestore }: VMManagerProps) {
  const isRunning = status === 'running';
  const isBusy = status === 'starting' || status === 'saving' || status === 'restoring';

  return (
    <div className="vm-manager">
      {!isRunning && status !== 'starting' ? (
        <>
          <button
            className="btn btn-primary"
            onClick={onStart}
            disabled={isBusy}
          >
            Start VM
          </button>
          <button
            className="btn btn-secondary"
            onClick={onRestore}
            disabled={isBusy}
          >
            Restore
          </button>
        </>
      ) : (
        <>
          <button
            className="btn btn-secondary"
            onClick={onSave}
            disabled={isBusy || !isRunning}
          >
            {isBusy && status !== 'starting' ? 'Saving...' : 'Save State'}
          </button>
          <button
            className="btn btn-danger"
            onClick={onStop}
            disabled={isBusy}
          >
            Stop VM
          </button>
        </>
      )}
    </div>
  );
}
