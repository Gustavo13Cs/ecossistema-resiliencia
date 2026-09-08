import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,
  video: false,
  screenshotOnRunFailure: false,
  trashAssetsBeforeRuns: false,
  viewportWidth: 1440,
  viewportHeight: 900,

  e2e: {
    baseUrl: "http://localhost:3001",
    setupNodeEvents() {},
  },
});
