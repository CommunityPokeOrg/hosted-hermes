import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";

describe("password hashing", () => {
  it("hashes with scrypt and verifies", () => {
    const hash = hashPassword("s3cret!");
    expect(hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword("s3cret!", hash)).toBe(true);
  });

  it("rejects wrong passwords", () => {
    const hash = hashPassword("correct");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces unique salts", () => {
    expect(hashPassword("x")).not.toBe(hashPassword("x"));
  });

  it("rejects malformed stored hashes", () => {
    expect(verifyPassword("x", "not-a-hash")).toBe(false);
    expect(verifyPassword("x", "bcrypt:abc:def")).toBe(false);
  });
});
