import { fileURLToPath } from "node:url";
import path from "node:path";

export const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_DIR = path.join(E2E_DIR, ".auth");
export const STATE_PATH = path.join(AUTH_DIR, "state.json");
export const FIXTURES_PATH = path.join(AUTH_DIR, "fixtures.json");
