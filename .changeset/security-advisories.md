---
"@doc-recorder/desktop": patch
"@doc-recorder/shared": patch
---

Security fixes:

- Project import now rejects ZIP archives with entries that would extract
  outside the new project folder (`../` or absolute paths). Previously a
  crafted archive could write files anywhere the app had access to. The
  whole archive is rejected before anything is written.
- Resolve all critical and high dependency advisories: `tar`, Electron
  42.11, electron-builder 26.18, electron-updater 6.8.11, `@xmldom/xmldom`,
  `undici`, `fast-uri`, `js-yaml`, `postcss`, `vite` and others via
  in-range updates.
- Upgrade `adm-zip` 0.5 → 0.6.1 and `sharp` 0.34 → 0.35.5. The `shared`
  package's optional `sharp` peer range is now `^0.35.5`.
- Add an npm release cooldown (`min-release-age=7`) so newly published
  dependency versions are not installed until they are a week old.
