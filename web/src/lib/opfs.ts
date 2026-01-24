export class OPFSManager {
  private root: FileSystemDirectoryHandle | null = null;

  async init(): Promise<void> {
    this.root = await navigator.storage.getDirectory();
  }

  private ensureInit(): FileSystemDirectoryHandle {
    if (!this.root) {
      throw new Error('OPFSManager not initialized. Call init() first.');
    }
    return this.root;
  }

  async saveVMState(instanceId: string, state: ArrayBuffer): Promise<string> {
    const root = this.ensureInit();
    const path = `states/${instanceId}.bin`;
    const dir = await root.getDirectoryHandle('states', { create: true });
    const file = await dir.getFileHandle(`${instanceId}.bin`, { create: true });
    const writable = await file.createWritable();
    await writable.write(state);
    await writable.close();
    return path;
  }

  async loadVMState(instanceId: string): Promise<ArrayBuffer | null> {
    const root = this.ensureInit();
    try {
      const dir = await root.getDirectoryHandle('states');
      const file = await dir.getFileHandle(`${instanceId}.bin`);
      const blob = await file.getFile();
      return blob.arrayBuffer();
    } catch {
      return null;
    }
  }

  async deleteVMState(instanceId: string): Promise<boolean> {
    const root = this.ensureInit();
    try {
      const dir = await root.getDirectoryHandle('states');
      await dir.removeEntry(`${instanceId}.bin`);
      return true;
    } catch {
      return false;
    }
  }

  async getQuota(): Promise<{ usage: number; quota: number }> {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }

  async listStates(): Promise<string[]> {
    const root = this.ensureInit();
    try {
      const dir = await root.getDirectoryHandle('states');
      const names: string[] = [];
      // Use entries() which is more widely supported in TypeScript types
      const entries = dir.entries();
      for await (const [name, handle] of entries) {
        if (handle.kind === 'file' && name.endsWith('.bin')) {
          names.push(name.replace('.bin', ''));
        }
      }
      return names;
    } catch {
      return [];
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }
}
