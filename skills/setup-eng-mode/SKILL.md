---
name: setup-eng-mode
description: Validate and orchestrate an Eng Mode installation. Use for /setup-eng-mode, checking the Eng extension link, migrating model roles, auditing skill or agent shadows, or validating and authoring project contracts.
---

# Setup Eng Mode

Setup validates the OMP installation and provisions repository contracts. It does not install duplicate machinery. Re-running setup is idempotent.

A blocked step blocks only the steps that depend on it. Record the exact missing approval or prerequisite, then continue with every independent step and section. Never report a step as done, or a check as passed, without observing it.

## 1. Installation and source identity

1. Report the extension's own load state. Whether this session runs from a fresh `omp -e <path>` process-local load or a persistent plugin link, and whether the `omp-plugins` provider is enabled.
2. Discover and pin the exact absolute extension root from the active extension's load path or plugin registry. Resolve symlinks and distinguish the loaded package from a development checkout. Use that discovered root as `ENG_ROOT` for companion and sync commands; never assume a home-directory layout. Provenance passes only when every shipped skill and agent resolves from that exact root.
3. Verify tool discovery. The `eng_orch` tool is callable and one live `init` against a throwaway store succeeds.
4. When companion-plugin configuration is authorized, run `bun --cwd "$ENG_ROOT" run compact-adviser`. It resolves `TYPESAFE_API_KEY` exactly as [compact-adviser](https://github.com/kunchenguid/compact-adviser) does: process environment, key saved through `/compact-adviser`, then `.env` in the launch directory, agent directory, config root, and home. With a key it installs and enables `npm:compact-adviser` and seeds mode `auto` once; without a key it disables the plugin. Report the printed key source and enabled state, never the key. If installation or config mutation is prohibited, report this gate as not exercised, not a plugin failure.
5. Check Bun with `bun --version`. Then run `eng-github whoami` as documented in [`eng-github`](../eng-github/SKILL.md) to validate GitHub token access. Record the login and token source. Never include token values in output.

## 2. Shadows and collisions

Observed skill precedence (OMP `skills.md`): native `.omp` user/project skills (100), then the Eng extension through `omp-plugins` (90), then Claude-provider skills (80), then project `.agents/skills` (70). A repository copy of an Eng skill therefore never shadows the extension for OMP users; it exists only for agents without the plugin.

1. Report the full intersection of the extension's exact `skillNames` with the host repository's `.agents/skills` and `.claude/skills`. Names in `portableSkillNames` from `src/portable-skills.ts` are optional cross-client copies. Their absence in an OMP-only repository is not an installation failure. If copies exist, run `bun --cwd "$ENG_ROOT" run sync-skills:check <repo>` and distinguish existing-copy drift from missing optional copies. Report other intersections as stale duplicates. Never sync, delete, or commit private `.agents` files against repository law.
2. Any user-native `.omp/skills` or user-agent shadow of an exact `skillNames`/`agentNames` entry is an error. Report it by name. Quarantining a shadow is an explicit operator-approved setup action with a rollback record, never a silent move.

## 3. Model roles

Role migration is two-stage and owned by the extension's config migrator. Setup runs it. It never hand-edits roles.

1. **Prepare:** atomically add and validate required roles while retaining old roles: `code` from `boja_code` when absent, `judgment` from `boja_judgment`, `adversary` from `boja_adversary`, and `fast` from `boja_fast`. Read `task.disabledAgents` before determining panel requirements. Require `panel_opus`, `panel_sol`, `panel_fable`, and `panel_deepseek` only for their enabled seats. Disabled seats need no role, selection, or fallback. Preserve operator provider exclusions. An existing valid new value wins. A differing old/new pair is a conflict and produces no change without explicit user selection. Missing required roles need selection from actually available, permitted models. Never invent a concrete model.
2. **Retire:** only after hard-cut proof shows no old workflow consumer remains, atomically delete `boja_fast`, `boja_code`, `boja_judgment`, and `boja_adversary`.
3. Both stages capture the prior config and restore it byte-for-byte on failure. `smol`, `review`, `commit`, and all unrelated settings are preserved.
   `flash` is the cheap text-only role for rubric reviews, comment audits, and mechanical delegates (`comment-sicko`, `task`, repository precommit agents). It must resolve to a model with tool use and no image requirement; when absent, chains fall through to `@review` and setup reports the fallback.
4. Do not create a second config file. OMP owns model config in the active agent directory's `config.yml`. Project behavior lives in the repository's `.omp` directory and the extension.

## 4. Agents and panel resolution

1. Read `task.disabledAgents` first. Report each disabled shipped agent as `disabled`, with no required role or fallback, and do not re-enable it. Verify discoverability and end-to-end role resolution for enabled agents only. No shipped agent may contain a concrete provider-qualified selector. The workstation config supplies concrete models. `design-agent` uses `designer` and falls through to `@judgment` when unset.
2. Resolve enabled chains through their referenced role keys. Flag identical resolutions and validate fallbacks only among permitted providers. Provider diversity is not a reason to override exclusions or enable a disabled agent. An enabled `comment-sicko` must retain a resolvable fallback.
3. Report enabled panel seats' actual `resolvedModel` and fallback status, plus every disabled seat. Never claim the full default roster when seats are disabled. Report vendor diversity only from actual permitted resolutions.

## 5. Project contracts

Setup provisions both contracts. A missing contract is setup work, not a report line, and setup never substitutes an `UNCONFIGURED` sentinel for it. A sentinel is a decision only the repository owners make, by writing it themselves.

A `blocked-standards` decision from a missing `project-standards` stops product-code work, not setup. Contract authoring is the one write that decision permits during setup. Setup never edits product code, and the gate stays in force for every other writer until `eng_orch contracts` returns `proceed`.

1. **Observe.** Run `eng_orch contracts` in `code-producing` mode. Record the decision, each contract's `parse` state and path, and whether git tracks that path (`git ls-files --error-unmatch PATH`).
2. **Honor what exists.** Never overwrite, move, or duplicate a contract that exists, tracked or local. A contract under the `.omp/skills` fallback stays there; a canonical `.agents/skills` copy would shadow it. Report a `malformed`, `wrong-name`, `unreadable`, or `unconfigured` contract with its path, and repair it only with approval for that exact file, since it may be tracked repository law.
3. **Place new contracts.** Author each missing contract under canonical `.agents/skills/<name>/`. Unless repository law says these contracts are committed, they are personal and checkout-local. For each authored directory that git does not track and does not already ignore (`git check-ignore -q PATH`), append one anchored entry such as `/.agents/skills/verify-project/` to the file `git rev-parse --git-path info/exclude` prints, skipping entries already present. Never edit `.gitignore` or a global excludes file, never `git add -f`, and never commit. Owners who want tracked contracts commit them and drop the exclude entry.
4. **Approval.** When session or repository rules gate file writes or commands, ask once before the first write. Name every path in one batch: each contract directory, its feature files, the exclude file, and any existing standards file that registration would edit. Add the commands and runtime prerequisites the `verify-project` proof needs (credentials, services, environments) to that batch only when the proof needs them. An approval never extends to cloud, production, or remote writes the operator did not name. A denied or unanswered item blocks only the step that needs it.
5. **Author `project-standards` first,** because `verify-project` registers in it. Interview the repository, not the user: agent instructions (`AGENTS.md`, `CLAUDE.md`, `.cursor/rules`), README and contributing docs, CI workflows, package scripts or Makefile, lint, format, and type configs, `CONTEXT.md`, and ADRs. Write `SKILL.md` with frontmatter `name: project-standards` and a `description`. Cover what the evidence supports: scope and architecture, exact dev, typecheck, lint, format, test, and build commands, test law, the pre-commit pass, stack-specific skills to read, review agents and the review skill, domain vocabulary sources and ADR convention, approval gates, and secret and production boundaries. Cite the file each rule comes from. List anything the repository does not answer under `Open questions` rather than inventing it. Record commands from evidence; claim one passes only if setup ran it under the approval gates.
6. **Author `verify-project`** by reading `skill://create-verification-skill` and running its whole flow: interview, generate, seed the feature map, prove end to end, and register the contract in `project-standards`. If standards are still missing, registration is blocked, not a reason to restart setup. Do not register a checkout-local verification path in tracked standards; leave that decision to the owners. Never infer the contract from package scripts alone. During setup, a checkout that does not build or start is reported precisely, not fixed, because setup never edits product code. When approval, credentials, a service, or an environment prevents proof, keep the contract with an `Unproven` section naming the unexecuted steps and their prerequisites. Affected behavioral claims remain `INCONCLUSIVE` until those steps run successfully.
7. **Validate.** Re-run `eng_orch contracts` and report the new decision. Anything other than `proceed` names the contract and parse state still at fault. `proceed` with unexecuted proof means contract present, proof blocked—not verification passed. For each checkout-local contract, confirm its exclude entry with `git check-ignore -v PATH` and confirm `git status --porcelain` does not list it. Report any authorized edits to existing contracts separately.

## 6. Runtime validation

Restart OMP after installing or updating the extension, then verify `eng_orch contracts` and a throwaway store initialization through the registered tool.

## 7. Capabilities

1. Verify `loop` is available without starting it and `goal` remains available. Reject duplicate tools.
2. Inspect task isolation settings and report both `enabled` and `apply` separately. `enabled: true` exposes per-task isolation; writers must still request it. `apply: true` integrates accepted worker patches into the parent checkout automatically; `apply: false` leaves them for the lead to integrate manually. Do not change these settings without explicit user approval.
3. Dry-route one feature, one bug, and one contested design without editing product code, exercising discovery for enabled agents and reporting disabled seats without dispatch.
4. Observe `git commit --help`. Read [`eng-github`](../eng-github/SKILL.md) and validate its prerequisites with Bun and `eng-github whoami`.

## 8. Report

Report per-agent resolved models, isolation, `goal`, `loop`, Bun availability, GitHub token access and source, commit capability, and every unavailable capability. For contracts, report the decision before and after authoring, each contract's parse state, source path, and placement (tracked, checkout-local, or `.omp` fallback), every exclude entry added, and each authoring step as done or blocked with its exact missing prerequisite. Name which `verify-project` proof steps ran and which did not. Refuse to report a capability as present without observing it.
