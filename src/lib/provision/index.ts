import { loadConfig, type AppConfig } from "@/lib/config";
import { getStore } from "@/lib/store";
import { DockerProvisioner } from "./docker";
import { MockProvisioner } from "./mock";
import { ProvisionService } from "./service";
import type { Provisioner } from "./types";

let provisioner: Provisioner | null = null;
let service: ProvisionService | null = null;

export function getProvisioner(config: AppConfig = loadConfig()): Provisioner {
  if (!provisioner) {
    provisioner =
      config.provisioner === "docker"
        ? new DockerProvisioner({
            socketPath: config.dockerSocket,
            host: config.dockerHost,
          })
        : new MockProvisioner();
  }
  return provisioner;
}

export function getProvisionService(): ProvisionService {
  if (!service) {
    const config = loadConfig();
    service = new ProvisionService(getStore(), getProvisioner(config), config);
  }
  return service;
}

/** For tests: replace the provisioner/service singletons. */
export function setProvisionerForTesting(p: Provisioner | null, config?: AppConfig): void {
  provisioner = p;
  service = null;
  if (p) {
    const cfg = config ?? loadConfig();
    service = new ProvisionService(getStore(), p, cfg);
  }
}
