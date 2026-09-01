import { describe, expect, it } from "vitest";
import { makeOriginCheck } from "./originAllowlist";

const PROD = ["https://ishak.dev", "https://www.ishak.dev", "http://localhost:3000"];

describe("makeOriginCheck", () => {
  it("allows exact allowlist matches only", () => {
    const ok = makeOriginCheck(PROD);
    expect(ok("https://ishak.dev")).toBe(true);
    expect(ok("https://www.ishak.dev")).toBe(true);
    expect(ok("http://localhost:3000")).toBe(true);
  });

  it("rejects near-misses and everything else", () => {
    const ok = makeOriginCheck(PROD);
    expect(ok("https://evil.example")).toBe(false);
    expect(ok("http://ishak.dev")).toBe(false); // scheme
    expect(ok("https://ishak.dev.evil.com")).toBe(false); // suffix trick
    expect(ok("https://ishak.dev:8443")).toBe(false); // port
    expect(ok("http://localhost:3001")).toBe(false); // port
    expect(ok("")).toBe(false);
    expect(ok("*")).toBe(false);
  });

  it("allows a preview Origin only when the regex is configured and matches", () => {
    const re = String.raw`^https://portfolio-[a-z0-9-]+\.vercel\.app$`;
    const withPreview = makeOriginCheck(PROD, re);
    const without = makeOriginCheck(PROD);

    expect(withPreview("https://portfolio-git-feat-x-ishak.vercel.app")).toBe(true);
    expect(without("https://portfolio-git-feat-x-ishak.vercel.app")).toBe(false);

    // regex is anchored — no partial / lookalike matches
    expect(withPreview("https://portfolio-x.vercel.app.evil.com")).toBe(false);
    expect(withPreview("https://other-project.vercel.app")).toBe(false);
  });
});
