---
name: eng-mode-sync-skills
description: Copy the portable eng-mode skills into this repository's .agents/skills so agents without the OMP plugin read the same text. Operator-invoked only, via /eng-mode-sync-skills.
disable-model-invocation: true
---

# Sync portable skills

Run only when the operator requests cross-client copies and repository law permits the writes. OMP-only repositories do not need these copies. Discover the exact extension or checkout root as `ENG_ROOT` through `setup-eng-mode`; do not assume its location. Preserve repository-owned contracts.

```sh
bun --cwd "$ENG_ROOT" run sync-skills "$PWD"
```

It deletes every `.agents/skills/<name>` that shadows a non-portable eng-mode skill, copies the portable set (`src/portable-skills.ts` `portableSkillNames`) verbatim, and writes `.agents/skills/.eng-mode-sync.json` with the source commit and per-file hashes.

Then review `git status`. If repository law forbids committing private `.agents` files, keep them private and do not open a PR for them. Otherwise, when delivery is requested, commit as `chore(skills): sync portable eng-mode skills @<sha>`, and open the PR with `eng-github pr create --base BASE --head BRANCH --title "TITLE" --body-file FILE`. Read [`eng-github`](../eng-github/SKILL.md) for the full command reference.

Drift check, for CI or before a release:

```sh
bun --cwd "$ENG_ROOT" run sync-skills:check "$PWD"
```

Non-zero exit lists each file that differs from eng-mode or each shadow that must be deleted.
