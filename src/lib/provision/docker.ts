import http from "node:http";
import {
  ProvisionerError,
  type ContainerInfo,
  type ContainerSpec,
  type ContainerStatsSample,
  type ProvisionResult,
  type Provisioner,
} from "./types";

const AGENT_CONTAINER_PORT = 8080;

interface DockerConnection {
  /** Unix socket path, or null when using TCP. */
  socketPath: string | null;
  host: string;
  port: number;
}

/**
 * Docker Engine API driver (REST over unix socket or TCP). No external
 * dependencies — uses node:http directly so it runs anywhere the dashboard
 * does, as long as it can reach the daemon socket.
 */
export class DockerProvisioner implements Provisioner {
  readonly driver = "docker";
  private conn: DockerConnection;
  private apiVersion: string;

  constructor(opts: { socketPath?: string; host?: string | null; apiVersion?: string } = {}) {
    this.apiVersion = opts.apiVersion ?? "v1.43";
    if (opts.host) {
      const url = new URL(opts.host);
      this.conn = {
        socketPath: null,
        host: url.hostname,
        port: Number(url.port || 2375),
      };
    } else {
      this.conn = {
        socketPath: opts.socketPath ?? "/var/run/docker.sock",
        host: "localhost",
        port: 0,
      };
    }
  }

  private request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: T }> {
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    return new Promise((resolvePromise, reject) => {
      const req = http.request(
        {
          method,
          path: `/${this.apiVersion}${path}`,
          socketPath: this.conn.socketPath ?? undefined,
          host: this.conn.socketPath ? undefined : this.conn.host,
          port: this.conn.socketPath ? undefined : this.conn.port,
          headers: payload
            ? { "content-type": "application/json", "content-length": payload.length }
            : {},
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            let parsed: unknown = raw;
            const ct = res.headers["content-type"] ?? "";
            if (ct.includes("application/json") && raw.length > 0) {
              try {
                parsed = JSON.parse(raw);
              } catch {
                parsed = raw;
              }
            }
            resolvePromise({ status: res.statusCode ?? 0, body: parsed as T });
          });
        },
      );
      req.on("error", (err) =>
        reject(new ProvisionerError(`docker request failed: ${err.message}`)),
      );
      if (payload) req.write(payload);
      req.end();
    });
  }

  private async expect<T = unknown>(
    method: string,
    path: string,
    okStatuses: number[],
    body?: unknown,
  ): Promise<T> {
    const { status, body: resBody } = await this.request<T>(method, path, body);
    if (!okStatuses.includes(status)) {
      const message =
        typeof resBody === "object" && resBody !== null && "message" in resBody
          ? String((resBody as { message: unknown }).message)
          : `docker API returned ${status}`;
      throw new ProvisionerError(message, status);
    }
    return resBody;
  }

  async create(spec: ContainerSpec): Promise<ProvisionResult> {
    const env = Object.entries(spec.env).map(([k, v]) => `${k}=${v}`);
    const created = await this.expect<{ Id: string }>(
      "POST",
      `/containers/create?name=${encodeURIComponent(spec.containerName)}`,
      [201],
      {
        Image: spec.image,
        Env: env,
        Labels: { "hosted-hermes.managed": "true", ...spec.labels },
        ExposedPorts: { [`${spec.containerPort}/tcp`]: {} },
        HostConfig: {
          NetworkMode: spec.network,
          NanoCpus: Math.round(spec.cpus * 1e9),
          Memory: spec.memoryMb * 1024 * 1024,
          PortBindings: {
            [`${spec.containerPort}/tcp`]: [{ HostPort: String(spec.hostPort) }],
          },
          RestartPolicy: { Name: "unless-stopped" },
        },
      },
    );
    return { containerId: created.Id, hostPort: spec.hostPort };
  }

  async start(containerId: string): Promise<void> {
    await this.expect("POST", `/containers/${containerId}/start`, [204, 304]);
  }

  async stop(containerId: string): Promise<void> {
    await this.expect("POST", `/containers/${containerId}/stop?t=10`, [204, 304, 404]);
  }

  async restart(containerId: string): Promise<void> {
    await this.expect("POST", `/containers/${containerId}/restart?t=10`, [204]);
  }

  async remove(containerId: string): Promise<void> {
    await this.expect("DELETE", `/containers/${containerId}?force=true`, [204, 404]);
  }

  async inspect(containerId: string): Promise<ContainerInfo> {
    const data = await this.expect<{
      Id: string;
      State: {
        Status: string;
        Running: boolean;
        StartedAt?: string;
        ExitCode?: number;
      };
    }>("GET", `/containers/${containerId}/json`, [200]);
    const startedAt = data.State.StartedAt;
    return {
      containerId: data.Id,
      running: data.State.Running,
      status: data.State.Status,
      startedAt: startedAt && !startedAt.startsWith("0001-") ? startedAt : null,
      exitCode: data.State.ExitCode ?? null,
    };
  }

  async logs(containerId: string, tail: number): Promise<string> {
    const raw = await this.expect<string>(
      "GET",
      `/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}`,
      [200],
    );
    // Docker multiplexed log frames have an 8-byte header per frame when the
    // container has a TTY off and stream attached; strip control bytes.
    return String(raw).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
  }

  async stats(containerId: string): Promise<ContainerStatsSample> {
    const data = await this.expect<{
      cpu_stats?: {
        cpu_usage?: { total_usage?: number };
        system_cpu_usage?: number;
        online_cpus?: number;
      };
      precpu_stats?: { cpu_usage?: { total_usage?: number }; system_cpu_usage?: number };
      memory_stats?: { usage?: number; limit?: number };
      networks?: Record<string, { rx_bytes?: number; tx_bytes?: number }>;
    }>("GET", `/containers/${containerId}/stats?stream=false`, [200]);

    const cpuDelta =
      (data.cpu_stats?.cpu_usage?.total_usage ?? 0) -
      (data.precpu_stats?.cpu_usage?.total_usage ?? 0);
    const systemDelta =
      (data.cpu_stats?.system_cpu_usage ?? 0) - (data.precpu_stats?.system_cpu_usage ?? 0);
    const onlineCpus = data.cpu_stats?.online_cpus ?? 1;
    const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * onlineCpus * 100 : 0;

    let rx = 0;
    let tx = 0;
    for (const net of Object.values(data.networks ?? {})) {
      rx += net.rx_bytes ?? 0;
      tx += net.tx_bytes ?? 0;
    }

    return {
      cpuPercent: Math.round(cpuPercent * 100) / 100,
      memoryMb: Math.round(((data.memory_stats?.usage ?? 0) / 1048576) * 10) / 10,
      memoryLimitMb: Math.round(((data.memory_stats?.limit ?? 0) / 1048576) * 10) / 10,
      networkRxBytes: rx,
      networkTxBytes: tx,
    };
  }
}

export { AGENT_CONTAINER_PORT };
