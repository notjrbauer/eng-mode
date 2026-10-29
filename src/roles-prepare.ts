import { homedir } from "node:os";
import { join } from "node:path";
import { applyRoleStageToFile } from "./roles.ts";

const stage = process.argv[2] === "retire" ? "retire" : "prepare";
const configPath = process.argv[3] ?? join(homedir(), ".omp", "agent", "config.yml");
console.log(JSON.stringify(applyRoleStageToFile(configPath, stage), null, 1));
