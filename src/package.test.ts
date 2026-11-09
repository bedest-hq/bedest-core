import { describe, it, expect } from "bun:test";
import pkg from "../package.json";

describe("package.json exports [CORE-04]", () => {
  it("lists types first, then import, then a default fallback", () => {
    expect(Object.keys(pkg.exports["."])).toEqual(["types", "import", "default"]);
    expect(pkg.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      default: "./dist/index.js",
    });
  });

  it("has no require condition pointing at the ESM build", () => {
    expect("require" in pkg.exports["."]).toBe(false);
  });

  it("ships only dist, README and LICENSE", () => {
    expect(pkg.files).toEqual(["dist", "README.md", "LICENSE"]);
    expect(pkg.sideEffects).toBe(false);
  });
});
