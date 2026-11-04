---
'@doc-recorder/desktop': patch
'@doc-recorder/shared': patch
---

Desktop now generates replay scripts and Markdown with the shared generators instead of stale local copies, so recorded quotes, backslashes, multiline values and template-like notes no longer break desktop replay scripts. Regenerated scripts also write the recording's own Markdown filename and separator. A fill action without a recorded value now replays as an empty fill instead of throwing.
