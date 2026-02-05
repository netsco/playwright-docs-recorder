# Release

Automate the full release pipeline: commit, changeset, version bump, README check, tag, and push to trigger GitHub Actions builds.

## Instructions

Follow these steps in order. Stop and ask for confirmation before pushing.

### Step 1: Review changes

Run these in parallel:
- `git status` — check for uncommitted changes
- `git diff --stat` — see what files changed
- `git log --oneline -5` — see recent commits for context

Summarize what's being released (new features, fixes, etc.).

### Step 2: Commit pending changes

If there are uncommitted changes:
1. Stage all relevant files (avoid secrets, .env, credentials)
2. Write a descriptive commit message following conventional commits (feat:, fix:, chore:, etc.)
3. Commit using a HEREDOC for the message

If the working tree is clean, skip this step.

### Step 3: Check README.md

Read the root `README.md` and compare it against CLAUDE.md and recent changes. Check that:
- CLI options table matches current options
- Keyboard shortcuts are up to date
- Desktop app features list reflects current functionality
- Video generation options are current

If README needs updates, edit it, then commit with `docs: update README.md`.

### Step 4: Determine affected packages

Examine commits since the last release tag to determine which packages changed:

```bash
git log --oneline $(git describe --tags --abbrev=0)..HEAD -- packages/cli/
git log --oneline $(git describe --tags --abbrev=0)..HEAD -- packages/desktop/
git log --oneline $(git describe --tags --abbrev=0)..HEAD -- packages/shared/
```

For each affected package, determine bump type:
- **patch**: Bug fixes, small tweaks, dependency updates
- **minor**: New features, backwards-compatible additions
- **major**: Breaking changes

### Step 5: Create changeset

Create a `.changeset/<random-name>.md` file (use a fun two-word name like `bright-foxes.md`):

```markdown
---
"@doc-recorder/cli": patch
"@doc-recorder/desktop": minor
"@doc-recorder/shared": patch
---

Brief description of what changed in this release.
```

Only include packages that actually changed. Use the bump types determined in Step 4.

### Step 6: Run changeset version

```bash
npx changeset version
```

This bumps versions in package.json files, updates CHANGELOGs, and removes consumed changeset files.

### Step 7: Read the new version

Read `packages/desktop/package.json` and extract the `version` field. The desktop version drives the release tag.

### Step 8: Commit the release

```bash
git add -A && git commit -m "$(cat <<'EOF'
chore: release v{version}
EOF
)"
```

Replace `{version}` with the actual version from Step 7.

### Step 9: Confirm before pushing

**STOP HERE** and show the user:
- The new version number
- Summary of what's being released
- The packages and bump types
- Ask for confirmation before pushing

### Step 10: Tag and push

After user confirms:

```bash
git tag v{version}
git push && git push origin v{version}
```

### Step 11: Done

Tell the user:
- The release tag that was pushed
- Link to GitHub Actions: `https://github.com/nickshanks347/documentation/actions`
- That builds for Windows, macOS, and Linux will start automatically
