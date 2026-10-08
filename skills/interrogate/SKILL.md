---
name: interrogate
description: Configurable adversarial review of a diff, design, or plan. Use for interrogate, challenge this, stress test, or find blind spots. Not merge-gating. Never auto-apply.
disable-model-invocation: true
---

# Interrogate

The default roster names four seats. Configuration, disabled agents, provider exclusions, and runtime dropouts determine the active panel. Every active seat receives the same review material. The lead applies judgment and never auto-edits.

## 1. Scope

Derive the review surface before dispatch:

- Use a user-supplied artifact, files, or diff when named.
- Otherwise, on a branch, review the branch-base diff (`git diff <base>...HEAD`), using the PR base when known and the repository's default branch otherwise.
- When the request refers to recent work rather than explicit paths, locate that work from the conversation and commits.

Package the diff or file contents with the surrounding code, tests, contracts, and decisions reviewers need. Do not include unrelated working-tree changes.

## 2. Intent

Before dispatch, state the intent in one clear paragraph from the request, commit messages, PR title and description when present, and the code. Reviewers challenge execution, not the product call. Ask only when those sources leave materially different plausible intents.

## 3. Rubric

Read and apply [`references/rubric.md`](references/rubric.md) plus [`references/code-quality-review.md`](references/code-quality-review.md). Build every seat prompt from [`references/reviewer-prompt.md`](references/reviewer-prompt.md), filling the same intent, artifact, rubric, and code-quality contents.

## 4. Panel

Use the repository or session's configured `interrogate reviewers` list of project agent names when present, extending or shrinking the labels to match. Agent definitions own model routing. Configuration must not put provider-specific model selectors in prompts. Without a configured list, use:

| Agent | Intended model family |
|---|---|
| `panel-opus` | Anthropic Opus |
| `panel-sol` | OpenAI Sol |
| `panel-fable` | Anthropic Fable |
| `panel-deepseek` | DeepSeek V4 Pro |

Before resolving any seat, filter the configured or default roster against `task.disabledAgents` and the operator's provider exclusions. Report disabled or excluded seats without resolving, recovering, substituting, or dispatching them. Never use a fallback to re-enable a disabled seat. Resolve only the remaining seats. If a role is unavailable, recover through the runtime resolver using permitted providers only. Prefer the same family and highest reasoning tier, and record the substitution. Treat resolver-owned `auto` or parent-inheritance as valid only when the resulting provider is permitted. If no permitted equivalent resolves, drop the seat and report it. If no seats remain, report that no review ran. Do not silently duplicate another seat or claim the full default roster.

Dispatch one `task` batch with the same intent, artifact, and rubric to every permitted resolved seat. After it settles, inspect each result's `resolvedModel` and `resolvedModelIsFallback` when exposed. Report actual models and vendors. A resolution to an excluded provider is not a valid review seat; omit its findings from synthesis and report the routing violation. Missing metadata means vendor `unverified`. Never infer a vendor from the nominal agent, count it toward cross-vendor agreement, or call the roster complete. A fallback is a substitution even when the nominal agent returned normally. Continue after dropouts. Pick each `task` item's `effort` for the job, per the **eng-mode** skill's Design and delegation section.

## 5. Synthesis and lead judgment

Read every report and apply [`references/lead-judgment.md`](references/lead-judgment.md). Parse every finding, including nits and findings later rejected. Deduplicate descriptions of the same issue while retaining every raising seat. Distinguish consensus findings from lone findings, and record explicit disagreements rather than forcing agreement.

Compute agreement over actual resolved vendors, never nominal seats. Independent agreement from two or more resolved vendors is high signal. Opus/Fable agreement without a cross-vendor fallback is one-vendor reinforcement, not cross-vendor consensus. Lone findings stay visible at lower confidence. Severity and evidence can still make one actionable.

Categorize every finding:

- **Act on.** Correctness, security, observable contract, or documented project invariant. Blocks a real PR.
- **Consider.** Real concern. Cost or timing is unclear.
- **Noted.** Valid but not actionable now.
- **Dismissed.** Wrong, nit, or missing context.

For every categorized finding, name all seats and each resolved vendor (or `unverified`) that raised it and give a one-line rationale for the category. For merged findings, preserve all provenance. For disagreements, name both positions and explain the lead's conclusion.

## Output

Use these named sections in order: **Intent**, **Reviewers**, **Act on**, **Consider**, **Noted**, **Dismissed**, **Agreement map**. Under **Reviewers**, list every configured/default seat, enabled or disabled status, exclusion reason, resolved model, actual vendor, fallback or recovery, dropout status, and finding count. Disabled seats have no resolved model and zero findings. The four finding sections account for every parsed finding from permitted seats with provenance and category rationale. The agreement map separates cross-vendor consensus, same-vendor reinforcement, lone findings, and explicit disagreements. No auto-edits.

The Standards + Spec review skill that `project-standards` names remains separate review. Shipping remains merge safety. Interrogate replaces neither.
