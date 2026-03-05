import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",     // litesvm uses native bindings, forks is safer
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
