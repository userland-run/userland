import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { V86Emulator } from '../lib/v86';

interface TerminalProps {
  emulator: V86Emulator | null;
}

export function TerminalComponent({ emulator }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a2e',
        foreground: '#eee',
        cursor: '#4ecca3',
        cursorAccent: '#1a1a2e',
        selectionBackground: '#4ecca344',
      },
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Show welcome message when no VM is running
    if (!emulator) {
      terminal.writeln('\x1b[32mVM Workbench\x1b[0m');
      terminal.writeln('');
      terminal.writeln('Click "Start VM" to boot Alpine Linux.');
      terminal.writeln('');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  // Connect terminal to emulator when it changes
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    // Clear previous connection
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!emulator) {
      return;
    }

    // Clear terminal and show boot message
    terminal.clear();
    terminal.writeln('\x1b[32mBooting Alpine Linux...\x1b[0m');
    terminal.writeln('');

    // Connect emulator serial output to terminal
    const unsubscribe = emulator.onSerialOutput((byte: number) => {
      terminal.write(String.fromCharCode(byte));
    });

    // Connect terminal input to emulator serial
    const onData = terminal.onData((data) => {
      for (let i = 0; i < data.length; i++) {
        emulator.sendSerialByte(data.charCodeAt(i));
      }
    });

    cleanupRef.current = () => {
      unsubscribe();
      onData.dispose();
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [emulator]);

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        padding: '8px',
      }}
    />
  );
}
