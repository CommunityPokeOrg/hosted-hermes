// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge, formatBytes, formatUptime } from "@/components/ui";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="running" />);
    expect(screen.getByText("running")).toBeTruthy();
  });
});

describe("formatBytes", () => {
  it("formats magnitudes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5242880)).toBe("5.0 MB");
    expect(formatBytes(3221225472)).toBe("3.00 GB");
  });
});

describe("formatUptime", () => {
  it("renders seconds/minutes/hours", () => {
    const now = Date.now();
    expect(formatUptime(new Date(now - 30_000).toISOString())).toBe("30s");
    expect(formatUptime(new Date(now - 120_000).toISOString())).toBe("2m");
    expect(formatUptime(new Date(now - 7_200_000).toISOString())).toBe("2h 0m");
    expect(formatUptime(null)).toBe("—");
  });
});
