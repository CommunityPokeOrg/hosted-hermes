import { describe, expect, it } from "vitest";
import { AgentConfigInputSchema, CreateInstanceInputSchema } from "@/lib/models";

describe("CreateInstanceInputSchema", () => {
  it("accepts valid names", () => {
    const parsed = CreateInstanceInputSchema.parse({ name: "agent-01", agentConfigId: "x" });
    expect(parsed.name).toBe("agent-01");
  });

  it.each(["-bad", "Bad-Name", "bad_name", "a".repeat(64), ""])(
    "rejects invalid name %j",
    (name) => {
      expect(() => CreateInstanceInputSchema.parse({ name, agentConfigId: "x" })).toThrow();
    },
  );
});

describe("AgentConfigInputSchema", () => {
  it("applies defaults", () => {
    const parsed = AgentConfigInputSchema.parse({ name: "a", model: "m" });
    expect(parsed.resources).toEqual({ cpus: 1, memoryMb: 512 });
    expect(parsed.tools).toEqual([]);
    expect(parsed.env).toEqual({});
  });

  it("rejects oversized resources", () => {
    expect(() =>
      AgentConfigInputSchema.parse({ name: "a", model: "m", resources: { cpus: 64, memoryMb: 512 } }),
    ).toThrow();
  });
});
