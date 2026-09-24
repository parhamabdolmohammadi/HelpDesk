import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  AGENT_EMAIL,
  AGENT_PASSWORD,
} from "./helpers/test-env";

export const AUTH_DIR = path.join(process.cwd(), "e2e", ".auth");
export const ADMIN_STORAGE_STATE = path.join(AUTH_DIR, "admin.json");
export const AGENT_STORAGE_STATE = path.join(AUTH_DIR, "agent.json");

async function loginAndSaveState(
  baseURL: string,
  email: string,
  password: string,
  outFile: string,
) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/");

  await page.context().storageState({ path: outFile });
  await browser.close();
}

/**
 * Logs in once per role (ADMIN / AGENT) through the real UI and saves the
 * resulting session cookie as a Playwright storageState file. Specs that
 * only need "already logged in as role X" as a precondition load this via
 * `test.use({ storageState: ... })` instead of repeating the UI login flow
 * in every test.
 *
 * There was no globalSetup/globalTeardown before this suite existed (see
 * CLAUDE.md-adjacent project notes); this is the explicit addition of one,
 * wired in via `playwright.config.ts`'s `globalSetup` option.
 */
export default async function globalSetup(config: FullConfig) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL as string | undefined;
  if (!baseURL) {
    throw new Error("Expected projects[0].use.baseURL to be set in playwright.config.ts");
  }

  await loginAndSaveState(baseURL, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STORAGE_STATE);
  await loginAndSaveState(baseURL, AGENT_EMAIL, AGENT_PASSWORD, AGENT_STORAGE_STATE);
}
