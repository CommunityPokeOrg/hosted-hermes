import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DockerProvisioner } from "@/lib/provision/docker";
import type { ContainerSpec } from "@/lib/provision/types";

/**
 * Integration test: the Docker driver against a fake Docker Engine API
 * served over TCP. Verifies request shape (method, path, body) and that
 * responses are parsed into our domain types.
 */
interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
}

const requests: RecordedRequest[] = [];
let server: http.Server;
let provisioner: DockerProvisioner;

const spec: ContainerSpec = {
  containerName: "hh-agent-test",
  image: "hermes:latest",
  env: { HERMES_MODEL: "hermes-3-70b", HERMES_INSTANCE_ID: "i1" },
  hostPort: 19000,
  containerPort: 8080,
  cpus: 0.5,
  memoryMb: 256,
  network: "hosted-hermes",
  labels: { "hosted-hermes.instance-id": "i1" },
};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      requests.push({ method: req.method!, url: req.url!, body: raw ? JSON.parse(raw) : undefined });
      const url = req.url!;

      res.setHeader("content-type", "application/json");
      if (url.includes("/containers/create")) {
        res.statusCode = 201;
        res.end(JSON.stringify({ Id: "abc123" }));
      } else if (url.includes("/start") || url.includes("/stop") || url.includes("/restart")) {
        res.statusCode = 204;
        res.end();
      } else if (url.includes("/json")) {
        res.end(
          JSON.stringify({
            Id: "abc123",
            State: { Status: "running", Running: true, StartedAt: "2026-01-01T00:00:00Z", ExitCode: 0 },
          }),
        );
      } else if (url.includes("/stats")) {
        res.end(
          JSON.stringify({
            cpu_stats: { cpu_usage: { total_usage: 200 }, system_cpu_usage: 2000, online_cpus: 2 },
            precpu_stats: { cpu_usage: { total_usage: 100 }, system_cpu_usage: 1000 },
            memory_stats: { usage: 104857600, limit: 268435456 },
            networks: { eth0: { rx_bytes: 1000, tx_bytes: 500 } },
          }),
        );
      } else if (url.includes("/logs")) {
        res.setHeader("content-type", "text/plain");
        res.end("line1\nline2\n");
      } else {
        res.statusCode = 204;
        res.end();
      }
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  provisioner = new DockerProvisioner({ host: `tcp://127.0.0.1:${port}` });
});

afterAll(() => server.close());

describe("DockerProvisioner against fake Engine API", () => {
  it("creates a container with the expected payload", async () => {
    const result = await provisioner.create(spec);
    expect(result).toEqual({ containerId: "abc123", hostPort: 19000 });

    const create = requests.find((r) => r.url.includes("/containers/create"))!;
    expect(create.method).toBe("POST");
    expect(create.url).toContain("name=hh-agent-test");
    const body = create.body as Record<string, unknown>;
    expect(body.Image).toBe("hermes:latest");
    const hostConfig = body.HostConfig as Record<string, unknown>;
    expect(hostConfig.NetworkMode).toBe("hosted-hermes");
    expect(hostConfig.NanoCpus).toBe(500000000);
    expect(hostConfig.Memory).toBe(256 * 1024 * 1024);
    const bindings = hostConfig.PortBindings as Record<string, { HostPort: string }[]>;
    expect(bindings["8080/tcp"][0].HostPort).toBe("19000");
    expect((body.Env as string[])).toContain("HERMES_MODEL=hermes-3-70b");
    expect((body.Labels as Record<string, string>)["hosted-hermes.managed"]).toBe("true");
  });

  it("starts, inspects, stops and removes", async () => {
    await provisioner.start("abc123");
    await provisioner.restart("abc123");
    const info = await provisioner.inspect("abc123");
    expect(info.running).toBe(true);
    expect(info.startedAt).toBe("2026-01-01T00:00:00Z");
    await provisioner.stop("abc123");
    await provisioner.remove("abc123");

    expect(requests.some((r) => r.method === "POST" && r.url.includes("/start"))).toBe(true);
    expect(requests.some((r) => r.method === "POST" && r.url.includes("/restart"))).toBe(true);
    expect(requests.some((r) => r.method === "DELETE" && r.url.includes("/containers/abc123"))).toBe(true);
  });

  it("parses stats into a sample", async () => {
    const s = await provisioner.stats("abc123");
    // (200-100)/(2000-1000) * 2 cpus * 100 = 20%
    expect(s.cpuPercent).toBe(20);
    expect(s.memoryMb).toBe(100);
    expect(s.memoryLimitMb).toBe(256);
    expect(s.networkRxBytes).toBe(1000);
    expect(s.networkTxBytes).toBe(500);
  });

  it("fetches logs", async () => {
    const logs = await provisioner.logs("abc123", 10);
    expect(logs).toContain("line1");
    const call = requests.find((r) => r.url.includes("/logs"))!;
    expect(call.url).toContain("tail=10");
  });
});
