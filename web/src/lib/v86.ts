export type V86Status = 'stopped' | 'starting' | 'running' | 'saving' | 'restoring' | 'error';

export interface V86Config {
  memoryMB: number;
  screenContainer?: HTMLElement;
  filesystem?: {
    basefs: string;
    baseurl: string;
  };
  onStatusChange?: (status: V86Status) => void;
}

declare global {
  interface Window {
    V86: new (config: Record<string, unknown>) => V86Instance;
  }
}

interface V86Instance {
  add_listener(event: string, callback: (...args: unknown[]) => void): void;
  remove_listener(event: string, callback: (...args: unknown[]) => void): void;
  stop(): void;
  destroy(): void;
  save_state(): Promise<ArrayBuffer>;
  restore_state(state: ArrayBuffer): Promise<void>;
  serial0_send(char: number): void;
  keyboard_send_scancodes(codes: number[]): void;
}

export class V86Emulator {
  private instance: V86Instance | null = null;
  private config: V86Config;
  private serialListeners: Array<(byte: number) => void> = [];

  constructor(config: V86Config) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (typeof window.V86 === 'undefined') {
      throw new Error('v86 library not loaded. Make sure libv86.js is included.');
    }

    return new Promise((resolve, reject) => {
      try {
        this.instance = new window.V86({
          wasm_path: '/v86/v86.wasm',
          memory_size: this.config.memoryMB * 1024 * 1024,
          vga_memory_size: 8 * 1024 * 1024,
          screen_container: this.config.screenContainer,
          bios: { url: '/v86/seabios.bin' },
          vga_bios: { url: '/v86/vgabios.bin' },
          bzimage: { url: '/alpine/vmlinuz-virt' },
          initrd: { url: '/alpine/initramfs-virt' },
          filesystem: this.config.filesystem,
          cmdline: 'console=ttyS0 root=host9p rootfstype=9p rootflags=trans=virtio,cache=loose rw init=/sbin/init',
          autostart: true,
          disable_keyboard: false,
          disable_mouse: true,
        });

        this.instance.add_listener('emulator-started', () => {
          resolve();
        });

        // Forward serial output to listeners
        this.instance.add_listener('serial0-output-byte', (byte: unknown) => {
          const byteNum = byte as number;
          for (const listener of this.serialListeners) {
            listener(byteNum);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  stop(): void {
    if (this.instance) {
      this.instance.stop();
      this.instance.destroy();
      this.instance = null;
    }
  }

  async saveState(): Promise<ArrayBuffer> {
    if (!this.instance) {
      throw new Error('Emulator not running');
    }
    return this.instance.save_state();
  }

  async restoreState(state: ArrayBuffer): Promise<void> {
    if (!this.instance) {
      throw new Error('Emulator not running');
    }
    await this.instance.restore_state(state);
  }

  sendSerial(text: string): void {
    if (!this.instance) return;
    for (let i = 0; i < text.length; i++) {
      this.instance.serial0_send(text.charCodeAt(i));
    }
  }

  sendSerialByte(byte: number): void {
    if (!this.instance) return;
    this.instance.serial0_send(byte);
  }

  onSerialOutput(callback: (byte: number) => void): () => void {
    this.serialListeners.push(callback);
    return () => {
      const idx = this.serialListeners.indexOf(callback);
      if (idx >= 0) this.serialListeners.splice(idx, 1);
    };
  }

  get isRunning(): boolean {
    return this.instance !== null;
  }
}
