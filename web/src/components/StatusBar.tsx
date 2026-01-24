import { V86Status } from '../lib/v86';
import './StatusBar.css';

interface StatusBarProps {
  status: V86Status;
  dbReady: boolean;
}

export function StatusBar({ status, dbReady }: StatusBarProps) {
  const getStatusColor = (s: V86Status) => {
    switch (s) {
      case 'running': return '#4ecca3';
      case 'starting':
      case 'saving':
      case 'restoring': return '#f39c12';
      case 'error': return '#e74c3c';
      default: return '#888';
    }
  };

  const getStatusText = (s: V86Status) => {
    switch (s) {
      case 'running': return 'VM Running';
      case 'starting': return 'Starting...';
      case 'saving': return 'Saving State...';
      case 'restoring': return 'Restoring...';
      case 'error': return 'Error';
      default: return 'VM Stopped';
    }
  };

  return (
    <footer className="status-bar">
      <div className="status-item">
        <span
          className="status-dot"
          style={{ backgroundColor: getStatusColor(status) }}
        />
        <span>{getStatusText(status)}</span>
      </div>

      <div className="status-item">
        <span
          className="status-dot"
          style={{ backgroundColor: dbReady ? '#4ecca3' : '#888' }}
        />
        <span>DuckDB {dbReady ? 'Ready' : 'Loading'}</span>
      </div>

      <div className="status-item status-right">
        <span>v86 + Alpine Linux</span>
      </div>
    </footer>
  );
}
