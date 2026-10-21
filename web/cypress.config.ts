import { defineConfig } from "cypress";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { licensedMediaFixture } from "./cypress/licensed-media-fixture";

export default defineConfig({
  allowCypressEnv: false,
  video: false,
  screenshotOnRunFailure: false,
  trashAssetsBeforeRuns: false,
  viewportWidth: 1440,
  viewportHeight: 900,

  e2e: {
    baseUrl: "http://localhost:3001",
    setupNodeEvents(on) {
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.name === "electron") {
          launchOptions.preferences.width = 1600;
          launchOptions.preferences.height = 1100;
        }
        return launchOptions;
      });
      on("task", {
        "visual:checkpoint"(label: string) { console.log("Task6 checkpoint:", label); return null; },
        "visual:failure"(message: string) { console.error("Task6 original test failure:", message); return null; },
        "visual:licensed-fixture"() { return licensedMediaFixture(process.env); },
        "visual:cleanup"() {
          licensedMediaFixture(process.env);
          const result = spawnSync(process.execPath, ["-r", "ts-node/register", "test/fixtures/cleanup-exercise-library-browser.ts"], {
            cwd: resolve(__dirname, "../api"),
            env: { ...process.env, DOTENV_CONFIG_PATH: "__disabled_dotenv__" },
            encoding: "utf8",
          });
          if (result.error || result.status !== 0) throw new Error("Task6 local fixture cleanup failed");
          return null;
        },
        "drafts:session-back"(fixture) {
          const result = spawnSync(process.execPath, ["test/native-workout-draft-navigation.cjs", "--session-back"], {
            cwd: resolve(__dirname, "../api"), env: process.env,
            input: JSON.stringify(fixture), encoding: "utf8",
          });
          if (result.error || result.status !== 0) throw new Error(`Session Back proof failed: ${result.stderr}`);
          const proof = JSON.parse(result.stdout);
          console.log("Task7 document session Back proof", JSON.stringify(proof));
          return proof;
        },
        "drafts:spa-navigation"(cookies) {
          const result = spawnSync(process.execPath, ["test/native-workout-draft-navigation.cjs", "--spa"], {
            cwd: resolve(__dirname, "../api"), env: process.env,
            input: JSON.stringify(cookies), encoding: "utf8",
          });
          if (result.error || result.status !== 0) throw new Error(`SPA navigation proof failed: ${result.stderr}`);
          const proof = JSON.parse(result.stdout);
          console.log("Task7 SPA navigation proof", JSON.stringify(proof));
          return proof;
        },
        "drafts:change-active-in-other-tab"(fixture) {
          const result = spawnSync(process.execPath, ["test/native-workout-draft-navigation.cjs", "--change-active"], {
            cwd: resolve(__dirname, "../api"), env: process.env,
            input: JSON.stringify(fixture), encoding: "utf8",
          });
          if (result.error || result.status !== 0) throw new Error(`Concurrent browser tab failed: ${result.stderr}`);
          return JSON.parse(result.stdout);
        },
        "drafts:native-navigation"(cookies) {
          const result = spawnSync(process.execPath, ["test/native-workout-draft-navigation.cjs"], {
            cwd: resolve(__dirname, "../api"), env: process.env,
            input: JSON.stringify(cookies), encoding: "utf8",
          });
          if (result.error || result.status !== 0) throw new Error(`Native navigation proof failed: ${result.stderr}`);
          const proof = JSON.parse(result.stdout);
          console.log("Task7 native navigation proof", JSON.stringify(proof));
          return proof;
        },
        "drafts:cleanup"() {
          const result = spawnSync(process.execPath, ["-r", "ts-node/register", "test/fixtures/cleanup-workout-draft-browser.ts"], {
            cwd: resolve(__dirname, "../api"),
            env: { ...process.env, DOTENV_CONFIG_PATH: "__disabled_dotenv__" },
            encoding: "utf8",
          });
          if (result.error || result.status !== 0) throw new Error("Task7 local fixture cleanup failed");
          return null;
        },
      });
    },
  },
});
