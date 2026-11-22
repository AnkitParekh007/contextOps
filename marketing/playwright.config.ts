import {defineConfig,devices} from "@playwright/test";

export default defineConfig({
  testDir:"./tests",
  timeout:30_000,
  expect:{timeout:8_000},
  retries:process.env.CI?1:0,
  workers:process.env.CI?1:undefined,
  reporter:process.env.CI?"github":"list",
  use:{
    baseURL:"http://127.0.0.1:4173/contextOps/",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
  },
  projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}],
  webServer:{
    command:"npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url:"http://127.0.0.1:4173/contextOps/",
    timeout:60_000,
    reuseExistingServer:!process.env.CI,
  },
});
