# App Icons

Add the following icon files for electron-builder:

| File | Platform | Notes |
|------|----------|-------|
| `icon.ico` | Windows | 256x256 minimum, multi-size ICO recommended |
| `icon.icns` | macOS | Apple ICNS format with multiple sizes |
| `icon.png` | Linux | 512x512 PNG (or multiple sizes: 16, 32, 48, 64, 128, 256, 512) |

## Quick Setup

1. Create a 512x512 or 1024x1024 PNG source icon
2. Use a converter tool:
   - [electron-icon-maker](https://www.npmjs.com/package/electron-icon-maker)
   - [icon-gen](https://www.npmjs.com/package/icon-gen)
   - Online: [icoconvert.com](https://icoconvert.com)

```bash
# Using electron-icon-maker
npx electron-icon-maker --input=source-icon.png --output=./
```

If icons are missing, electron-builder will use a default Electron icon.
