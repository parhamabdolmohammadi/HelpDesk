import fs from "node:fs";
import path from "node:path";

/**
 * Reads credentials for the seeded test users out of server/.env.test at
 * runtime, instead of hardcoding them in spec files. server/.env.test is
 * gitignored and only exists locally / in CI secrets, so this throws with a
 * helpful message if it's missing rather than silently using undefined
 * credentials.
 */
function loadEnvTest(): Record<string, string> {
  const filePath = path.join(process.cwd(), "server", ".env.test");

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(
      `Could not read ${filePath}. Copy server/.env.test.example to ` +
        `server/.env.test and fill in real values before running e2e tests.`,
    );
  }

  const result: Record<string, string> = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    const isQuoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const env = loadEnvTest();

function required(key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`server/.env.test is missing ${key}`);
  }
  return value;
}

export const ADMIN_EMAIL = required("ADMIN_EMAIL");
export const ADMIN_PASSWORD = required("ADMIN_PASSWORD");
export const AGENT_EMAIL = required("AGENT_EMAIL");
export const AGENT_PASSWORD = required("AGENT_PASSWORD");
