# Troubleshooting Eng Mode

- **Delegate lacks LSP:** inspect `task.enableLsp`; enable and restart.
- **Checkpoint missing:** inspect `checkpoint.enabled`; restart after enabling.
- **Wrong panel model:** inspect `task.disabledAgents`, provider exclusions, and resolved-model badges. Disabled seats need no role or recovery. Report actual enabled vendors and fallbacks.
- **Isolated worker cannot revive:** expected; isolation is terminal. With `apply: false`, inspect and manually integrate the captured patch.
- **Eval child cannot receive follow-up:** expected; use normal tasks when steering matters.
- **UI tests pass but proof is inconclusive:** drive the mapped feature through the repository health gate.
- **Wrong playbook:** restate problem, finish condition, and edit permission, not skill ceremony. Or type `/eng-help` with the question.
- **Skill or agent shadow:** report unintended copies and obtain approval before removing them. Missing optional portable copies are not an OMP plugin failure; check existing copies for drift.
- **Secret placeholder reaches a tool:** inspect redacted output only; never paste the secret into context.
- **Context grows:** checkpoint, artifact matrices, delegate bulk reading, rewind with one evidence report.
- **Loop does not continue:** inspect `loop` status. Resume a paused loop with its prompt, or start a stopped loop with a new limit.
- **Learning project ambiguous:** configure exact team/project ID or key/name. `capture-learning` refuses ambiguity and searches before creation.
- **`/compact-adviser` missing or `Key: missing`:** when configuration changes are authorized, set `TYPESAFE_API_KEY` and run `bun --cwd "$ENG_ROOT" run compact-adviser` from the discovered extension root, then restart. Without a key setup leaves the plugin disabled.

For cross-session work, preserve goal, fixed point, evidence, risks, and next action.