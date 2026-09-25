import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Vitest config. Unit tests target pure domain logic only
 * (no DOM, no network). Server components and API routes are
 * validated through typecheck + build.
 */
export default defineConfig({
  resolve: {
    // Mirror tsconfig paths (@/* → ./src/*) so tests import like app code.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
