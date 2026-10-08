import { afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { applyRoleStageToFile, prepareRoles, resolveAgentChains } from "./roles.ts";

const roots: string[] = [];
const selectedRoles = {
  code: "code-selector",
  judgment: "judgment-selector",
  adversary: "adversary-selector",
  fast: "fast-selector",
  panel_opus: "opus-selector",
  panel_sol: "sol-selector",
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { force: true, recursive: true });
});

function configFile(document: unknown): string {
  const root = mkdtempSync(join(tmpdir(), "eng-mode-roles-"));
  roots.push(root);
  const path = join(root, "config.yml");
  writeFileSync(path, `# preserve unchanged bytes\n${stringify(document)}`);
  return path;
}

describe("enabled role migration", () => {
  it("prepares missing disabled seats without writing the config", () => {
    const path = configFile({
      modelRoles: selectedRoles,
      task: { disabledAgents: ["panel-fable", "panel-deepseek"] },
      unrelated: { keep: true },
    });
    const before = readFileSync(path, "utf8");
    const result = applyRoleStageToFile(path, "prepare");
    expect(result).toMatchObject({
      wrote: false,
      prepare: { status: "applied", added: {}, needsSelection: [], conflicts: [], invalid: [] },
    });
    expect(result.prepare?.agentResolution.map(({ agent }) => agent)).toEqual([
      "implementation-agent", "judgment-agent", "design-agent", "comment-sicko", "panel-opus", "panel-sol",
    ]);
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("still requires an explicit selection for an enabled missing seat and writes nothing", () => {
    const path = configFile({ modelRoles: selectedRoles, task: { disabledAgents: ["panel-deepseek"] } });
    const before = readFileSync(path, "utf8");
    expect(applyRoleStageToFile(path, "prepare")).toMatchObject({
      wrote: false,
      prepare: { status: "needs-selection", added: {}, needsSelection: ["panel_fable"] },
    });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("preserves disabled stored roles without validating or conflicting with selectors", () => {
    const result = prepareRoles({
      roles: { ...selectedRoles, panel_fable: "stored-selector", panel_deepseek: " " },
      disabledAgents: ["panel-fable", "panel-deepseek"],
      panelSelectors: { panel_fable: "different-selector", panel_deepseek: "incoming-selector" },
    });
    expect(result).toMatchObject({
      status: "applied", added: {}, conflicts: [], invalid: [],
      roles: { panel_fable: "stored-selector", panel_deepseek: " " },
    });
  });

  it("does not add selectors for disabled seats", () => {
    const result = prepareRoles({
      roles: selectedRoles,
      disabledAgents: ["panel-fable", "panel-deepseek"],
      panelSelectors: { panel_fable: "fable-selector", panel_deepseek: "deepseek-selector" },
    });
    expect(result).toMatchObject({ status: "applied", added: {} });
    expect(Object.keys(result.roles)).toEqual(["code", "judgment", "adversary", "fast", "panel_opus", "panel_sol"]);
  });

  it("keeps enabled-seat conflicts atomic and never writes the config", () => {
    const path = configFile({ modelRoles: selectedRoles, task: { disabledAgents: ["panel-fable", "panel-deepseek"] } });
    const before = readFileSync(path, "utf8");
    expect(applyRoleStageToFile(path, "prepare", { panelSelectors: { panel_sol: "different-selector" } })).toMatchObject({
      wrote: false,
      prepare: {
        status: "conflict", added: {},
        conflicts: [{ role: "panel_sol", existing: "sol-selector", incoming: "different-selector" }],
      },
    });
    expect(readFileSync(path, "utf8")).toBe(before);
  });

  it("retains four-seat selection and resolution when disabledAgents is absent", () => {
    const missing = prepareRoles({ roles: selectedRoles });
    expect(missing).toMatchObject({ status: "needs-selection", needsSelection: ["panel_fable", "panel_deepseek"] });
    const prepared = prepareRoles({
      roles: selectedRoles,
      panelSelectors: { panel_fable: "fable-selector", panel_deepseek: "deepseek-selector" },
    });
    expect(prepared).toMatchObject({ status: "applied", added: { panel_fable: "fable-selector", panel_deepseek: "deepseek-selector" } });
    expect(prepared.agentResolution.filter(({ agent }) => agent.startsWith("panel-")).map(({ agent, primary }) => ({ agent, primary }))).toEqual([
      { agent: "panel-opus", primary: "@panel_opus" },
      { agent: "panel-sol", primary: "@panel_sol" },
      { agent: "panel-fable", primary: "@panel_fable" },
      { agent: "panel-deepseek", primary: "@panel_deepseek" },
    ]);
  });

  it("resolves only enabled agents, including non-panel agents", () => {
    const resolutions = resolveAgentChains(selectedRoles, ["implementation-agent", "panel-fable", "panel-deepseek", "unrelated-agent"]);
    expect(resolutions.map(({ agent, primary }) => ({ agent, primary }))).toEqual([
      { agent: "judgment-agent", primary: "@judgment" },
      { agent: "design-agent", primary: "@judgment" },
      { agent: "comment-sicko", primary: null },
      { agent: "panel-opus", primary: "@panel_opus" },
      { agent: "panel-sol", primary: "@panel_sol" },
    ]);
  });

  it("accepts unrelated disabled names without disabling missing panel seats", () => {
    const path = configFile({ modelRoles: selectedRoles, task: { disabledAgents: ["unrelated-agent"] } });
    expect(applyRoleStageToFile(path, "prepare")).toMatchObject({
      wrote: false,
      prepare: { status: "needs-selection", needsSelection: ["panel_fable", "panel_deepseek"] },
    });
  });

  it("rejects malformed disabledAgents explicitly without writing", () => {
    for (const disabledAgents of [null, "panel-fable", {}, ["panel-fable", 42], [false]]) {
      const path = configFile({ modelRoles: selectedRoles, task: { disabledAgents } });
      const before = readFileSync(path, "utf8");
      expect(() => applyRoleStageToFile(path, "prepare")).toThrow("task.disabledAgents");
      expect(readFileSync(path, "utf8")).toBe(before);
    }
  });

  it("migrates generic roles and preserves unrelated config and disabled roles on a write", () => {
    const path = configFile({
      modelRoles: {
        boja_code: "code-selector", boja_judgment: "judgment-selector",
        boja_adversary: "adversary-selector", boja_fast: "fast-selector",
        panel_opus: "opus-selector", panel_sol: "sol-selector", panel_fable: " ",
      },
      task: { disabledAgents: ["panel-fable", "panel-deepseek", "unrelated-agent"], isolation: { enabled: true } },
      unrelated: { keep: [1, 2] },
    });
    expect(applyRoleStageToFile(path, "prepare")).toMatchObject({
      wrote: true,
      prepare: { status: "applied", added: { code: "code-selector", judgment: "judgment-selector", adversary: "adversary-selector", fast: "fast-selector" } },
    });
    expect(parse(readFileSync(path, "utf8"))).toEqual({
      modelRoles: {
        ...selectedRoles, boja_code: "code-selector", boja_judgment: "judgment-selector",
        boja_adversary: "adversary-selector", boja_fast: "fast-selector", panel_fable: " ",
      },
      task: { disabledAgents: ["panel-fable", "panel-deepseek", "unrelated-agent"], isolation: { enabled: true } },
      unrelated: { keep: [1, 2] },
    });
  });
});
