# Release Command

Create a changeset for the current changes and prepare for release.

## Instructions

1. Review the uncommitted changes with `git status` and `git diff`
2. Determine which packages are affected (cli, desktop, shared)
3. Determine the bump type based on changes:
   - **patch** (0.1.x): Bug fixes, small tweaks
   - **minor** (0.x.0): New features, backwards compatible
   - **major** (x.0.0): Breaking changes
4. Create a changeset file in `.changeset/` with a summary of changes
5. If the user wants to release now, run `npx changeset version` to bump versions and update CHANGELOGs

## Changeset File Format

Create a file in `.changeset/` with a random name like `happy-dogs-dance.md`:

```markdown
---
"@doc-recorder/cli": patch
"@doc-recorder/desktop": minor
"@doc-recorder/shared": patch
---

Brief description of what changed.
```

Only include packages that were actually modified.
