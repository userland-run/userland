import { useEffect, useState } from 'react';
import { useOPFS } from '../hooks/useOPFS';
import './DiskManager.css';

export function DiskManager() {
  const { manager, isReady, quota, refreshQuota } = useOPFS();
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    if (isReady) {
      manager.listStates().then(setStates);
    }
  }, [isReady, manager]);

  const handleDelete = async (stateId: string) => {
    if (confirm(`Delete saved state "${stateId}"?`)) {
      await manager.deleteVMState(stateId);
      const updated = await manager.listStates();
      setStates(updated);
      await refreshQuota();
    }
  };

  if (!isReady) {
    return <div className="disk-manager">Loading OPFS...</div>;
  }

  return (
    <div className="disk-manager">
      <h2>Disk Management</h2>

      {quota && (
        <div className="quota-info">
          <div className="quota-bar">
            <div
              className="quota-used"
              style={{ width: `${(quota.usage / quota.quota) * 100}%` }}
            />
          </div>
          <span className="quota-text">
            {manager.formatBytes(quota.usage)} / {manager.formatBytes(quota.quota)} used
          </span>
        </div>
      )}

      <h3>Saved VM States</h3>
      {states.length === 0 ? (
        <p className="no-states">No saved states. Use "Save State" to create one.</p>
      ) : (
        <ul className="states-list">
          {states.map(state => (
            <li key={state} className="state-item">
              <span className="state-name">{state}</span>
              <button
                className="btn btn-danger btn-small"
                onClick={() => handleDelete(state)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
