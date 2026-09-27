import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { MemoryStore, type PersistedState } from "./memory";

/**
 * JSON file-backed store. State is held in memory (MemoryStore) and flushed
 * to disk after mutations, debounced to collapse write bursts. Suitable for
 * single-node deployments; swap for Postgres/SQLite behind the same Store
 * interface for HA deployments.
 */
export class FileStore extends MemoryStore {
  private writeTimer: NodeJS.Timeout | null = null;
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {
    super();
    const absolute = resolve(filePath);
    this.filePath = absolute;
    mkdirSync(dirname(absolute), { recursive: true });
    if (existsSync(absolute)) {
      const raw = readFileSync(absolute, "utf8");
      if (raw.trim().length > 0) {
        this.restore(JSON.parse(raw) as PersistedState);
      }
    }
  }

  protected override dirty(): void {
    if (this.writeTimer) return;
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      this.pending = this.pending.then(() => this.persist());
    }, 25);
    this.writeTimer.unref?.();
  }

  private async persist(): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.snapshot(), null, 2), "utf8");
  }

  override async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
      this.pending = this.pending.then(() => this.persist());
    }
    await this.pending;
  }
}
