import { useState } from 'react';
import { useV86 } from './hooks/useV86';
import { useDB } from './hooks/useDB';
import { TerminalComponent } from './components/Terminal';
import { VMManager } from './components/VMManager';
import { ProfileManager } from './components/ProfileManager';
import { DiskManager } from './components/DiskManager';
import { StatusBar } from './components/StatusBar';
import './App.css';

type Tab = 'terminal' | 'profiles' | 'disks';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('terminal');
  const { emulator, status, start, stop, saveState, restoreState } = useV86();
  const { isReady: dbReady } = useDB();

  return (
    <div className="app">
      <header className="app-header">
        <h1>VM Workbench</h1>
        <nav className="tabs">
          <button
            className={activeTab === 'terminal' ? 'active' : ''}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal
          </button>
          <button
            className={activeTab === 'profiles' ? 'active' : ''}
            onClick={() => setActiveTab('profiles')}
          >
            Profiles
          </button>
          <button
            className={activeTab === 'disks' ? 'active' : ''}
            onClick={() => setActiveTab('disks')}
          >
            Disks
          </button>
        </nav>
        <VMManager
          status={status}
          onStart={start}
          onStop={stop}
          onSave={saveState}
          onRestore={restoreState}
        />
      </header>

      <main className="app-main">
        {activeTab === 'terminal' && (
          <div className="terminal-container">
            <TerminalComponent emulator={emulator} />
          </div>
        )}
        {activeTab === 'profiles' && <ProfileManager emulator={emulator} />}
        {activeTab === 'disks' && <DiskManager />}
      </main>

      <StatusBar status={status} dbReady={dbReady} />
    </div>
  );
}
