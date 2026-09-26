---
'@doc-recorder/shared': patch
---

Preserve recorded text as JavaScript string literals when generating replay scripts. Quotes, backslashes and multiline form values no longer break the exported script, and template-like text in notes is printed without evaluation.
