import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { V86Emulator, V86Status } from '../lib/v86';
import { OPFSManager } from '../lib/opfs';

interface V86ContextValue {
  emulator: V86Emulator | null;
  status: V86Status;
  start: () => Promise<void>;
  stop: () => void;
  saveState: () => Promise<void>;
  restoreState: () => Promise<void>;
}

const defaultValue: V86ContextValue = {
  emulator: null,
  status: 'stopped',
  start: async () => {},
  stop: () => {},
  saveState: async () => {},
  restoreState: async () => {},
};

const V86Context = createContext<V86ContextValue>(defaultValue);

export function V86Provider({ children }: { children: ReactNode }) {
  const [emulator, setEmulator] = useState<V86Emulator | null>(null);
  const [status, setStatus] = useState<V86Status>('stopped');
  const [opfs] = useState(() => new OPFSManager());

  const start = useCallback(async () => {
    if (emulator) return;

    setStatus('starting');

    const vm = new V86Emulator({
      memoryMB: 512,
      filesystem: {
        basefs: '/alpine/alpine-fs.json',
        baseurl: '/alpine/alpine-rootfs-flat/',
      },
      onStatusChange: setStatus,
    });

    try {
      await vm.start();
      setEmulator(vm);
      setStatus('running');
    } catch (err) {
      console.error('Failed to start VM:', err);
      setStatus('error');
    }
  }, [emulator]);

  const stop = useCallback(() => {
    if (emulator) {
      emulator.stop();
      setEmulator(null);
      setStatus('stopped');
    }
  }, [emulator]);

  const saveState = useCallback(async () => {
    if (!emulator) return;

    setStatus('saving');
    try {
      await opfs.init();
      const state = await emulator.saveState();
      await opfs.saveVMState('default', state);
      setStatus('running');
    } catch (err) {
      console.error('Failed to save state:', err);
      setStatus('error');
    }
  }, [emulator, opfs]);

  const restoreState = useCallback(async () => {
    setStatus('restoring');
    try {
      await opfs.init();
      const state = await opfs.loadVMState('default');

      if (!state) {
        console.warn('No saved state found');
        setStatus('stopped');
        return;
      }

      const vm = new V86Emulator({
        memoryMB: 512,
        filesystem: {
          basefs: '/alpine/alpine-fs.json',
          baseurl: '/alpine/alpine-rootfs-flat/',
        },
        onStatusChange: setStatus,
      });

      await vm.start();
      await vm.restoreState(state);
      setEmulator(vm);
      setStatus('running');
    } catch (err) {
      console.error('Failed to restore state:', err);
      setStatus('error');
    }
  }, [opfs]);

  return (
    <V86Context.Provider value={{ emulator, status, start, stop, saveState, restoreState }}>
      {children}
    </V86Context.Provider>
  );
}

export function useV86Context() {
  return useContext(V86Context);
}
