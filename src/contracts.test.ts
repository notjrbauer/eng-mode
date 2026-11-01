import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeEngOrch } from "./extension.ts";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { force: true, recursive: true }))
  );
});

async function repository(
  newline: string,
  standardsClosing = "---"
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "eng-mode-contracts-"));
  roots.push(root);
  for (const name of ["project-standards", "verify-project"]) {
    const directory = join(root, ".agents", "skills", name);
    await mkdir(directory, { recursive: true });
    const lines = ["---", `name: ${name}`, "description: test"];
    lines.push(
      name === "project-standards" ? standardsClosing : "---",
      "configured",
      ""
    );
    await writeFile(join(directory, "SKILL.md"), lines.join(newline));
  }
  return root;
}

describe("eng_orch contract frontmatter", () => {
  it("permits CRLF contracts with the same decision as LF contracts", async () => {
    for (const newline of ["\n", "\r\n"]) {
      const repositoryRoot = await repository(newline);
      const result = await executeEngOrch({
        action: "contracts",
        repositoryRoot,
        mode: "code-producing",
      });
      expect(result).toMatchObject({
        decision: "proceed",
        contracts: [
          { name: "project-standards", parse: "ok" },
          { name: "verify-project", parse: "ok" },
        ],
      });
    }
  });

  it("blocks a closing frontmatter marker with a suffix", async () => {
    const repositoryRoot = await repository("\n", "---oops");
    const result = await executeEngOrch({
      action: "contracts",
      repositoryRoot,
      mode: "code-producing",
    });
    expect(result).toMatchObject({
      decision: "blocked-standards",
      contracts: [
        { name: "project-standards", parse: "malformed" },
        { name: "verify-project", parse: "ok" },
      ],
    });
  });

  it("accepts quoted YAML scalars and inline comments", async () => {
    const repositoryRoot = await repository("\n");
    await writeFile(
      join(repositoryRoot, ".agents/skills/project-standards/SKILL.md"),
      '---\nname: "project-standards" # contract name\n---\nConfigured\n'
    );
    expect(
      await executeEngOrch({
        action: "contracts",
        repositoryRoot,
        mode: "code-producing",
      })
    ).toMatchObject({ decision: "proceed" });
  });

  it("ignores obsolete selection metadata", async () => {
    const repositoryRoot = await repository("\n");
    const obsoleteKey = ["forge", "provider"].join("-");
    await writeFile(
      join(repositoryRoot, ".agents/skills/project-standards/SKILL.md"),
      `---\nname: project-standards\n${obsoleteKey}: [unsupported]\n---\nConfigured\n`
    );
    expect(await executeEngOrch({ action: "contracts", repositoryRoot })).toMatchObject({
      decision: "proceed",
    });
  });

  it("rejects ambiguous or invalid YAML metadata", async () => {
    const repositoryRoot = await repository("\n");
    for (const metadata of [
      "name: project-standards\nname: other",
      "name: [unterminated",
    ]) {
      await writeFile(
        join(repositoryRoot, ".agents/skills/project-standards/SKILL.md"),
        `---\n${metadata}\n---\nConfigured\n`
      );
      expect(
        await executeEngOrch({
          action: "contracts",
          repositoryRoot,
          mode: "code-producing",
        })
      ).toMatchObject({
        decision: "blocked-standards",
        contracts: [{ parse: "malformed" }, { parse: "ok" }],
      });
    }
  });
});

describe("eng_orch missing contracts", () => {
  async function emptyRepository(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "eng-mode-contracts-"));
    roots.push(root);
    return root;
  }

  it("blocks code-producing work when project-standards is absent", async () => {
    const repositoryRoot = await emptyRepository();
    expect(
      await executeEngOrch({
        action: "contracts",
        repositoryRoot,
        mode: "code-producing",
      })
    ).toEqual({
      decision: "blocked-standards",
      mode: "code-producing",
      repositoryRoot,
      contracts: [
        {
          name: "project-standards",
          expectedPath: join(repositoryRoot, ".agents", "skills", "project-standards", "SKILL.md"),
          parse: "missing",
        },
        {
          name: "verify-project",
          expectedPath: join(repositoryRoot, ".agents", "skills", "verify-project", "SKILL.md"),
          parse: "missing",
        },
      ],
      reasons: [
        "project-standards is absent; code-producing work stops before any edit, write, or writer delegation",
      ],
    });
  });

  it("lets read-only work proceed without policy claims when project-standards is absent", async () => {
    const repositoryRoot = await emptyRepository();
    expect(
      await executeEngOrch({ action: "contracts", repositoryRoot, mode: "read-only" })
    ).toMatchObject({
      decision: "standards-unavailable-read-only",
      mode: "read-only",
      contracts: [{ parse: "missing" }, { parse: "missing" }],
      reasons: [
        "project-standards is absent; read-only work may proceed without policy-compliance claims",
      ],
    });
  });

  it("blocks absent project-standards even when verify-project is valid", async () => {
    const repositoryRoot = await repository("\n");
    await rm(join(repositoryRoot, ".agents", "skills", "project-standards"), {
      recursive: true,
    });
    expect(
      await executeEngOrch({
        action: "contracts",
        repositoryRoot,
        mode: "code-producing",
      })
    ).toMatchObject({
      decision: "blocked-standards",
      contracts: [{ parse: "missing" }, { parse: "ok" }],
    });
  });

  it("makes behavioral claims inconclusive when verify-project is absent", async () => {
    const repositoryRoot = await repository("\n");
    await rm(join(repositoryRoot, ".agents", "skills", "verify-project"), {
      recursive: true,
    });
    for (const mode of ["read-only", "code-producing"] as const) {
      expect(
        await executeEngOrch({ action: "contracts", repositoryRoot, mode })
      ).toMatchObject({
        decision: "inconclusive-verification",
        contracts: [{ parse: "ok" }, { parse: "missing" }],
        reasons: [
          "verify-project is missing; behavioral claims on the product surface are INCONCLUSIVE and browser proof is not a substitute",
        ],
      });
    }
  });
});
