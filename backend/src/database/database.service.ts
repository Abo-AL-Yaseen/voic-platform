import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ENVIRONMENT } from "../config/configuration.module.js";
import type { Environment } from "../config/environment.js";

export const DATABASE_SOURCE = Symbol("DATABASE_SOURCE");

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private probe?: Promise<boolean>;
  private stopping = false;

  constructor(
    @Inject(DATABASE_SOURCE) private readonly source: DataSource,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  async isReady(): Promise<boolean> {
    if (this.stopping) return false;
    // One in-flight probe prevents concurrent health requests exhausting the pool.
    if (!this.probe) {
      this.probe = this.checkConnection().catch(() => false);
      void this.probe.finally(() => {
        this.probe = undefined;
      });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.probe,
        new Promise<false>((resolve) => {
          timer = setTimeout(() => resolve(false), this.env.dbTimeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async checkConnection(): Promise<boolean> {
    if (!this.source.isInitialized) await this.source.initialize();
    if (this.stopping) return false;
    await this.source.query("SELECT 1");
    return !this.stopping;
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    await this.probe;
    if (this.source.isInitialized) await this.source.destroy();
  }
}
