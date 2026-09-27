import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**"],
    },
  },
});
