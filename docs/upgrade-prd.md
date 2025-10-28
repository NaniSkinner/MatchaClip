# Upgrade PRD: ClipForge Package Updates & Tailwind v4 Migration

## Overview

This document outlines the comprehensive upgrade plan for ClipForge, including:
- Migration to React 19 ecosystem
- Upgrade to Next.js 15.5
- Migration to Tailwind CSS v4
- Update all supporting packages to latest versions

**Timeline:** Single upgrade session
**Risk Level:** Medium (multiple major version upgrades)
**Testing Required:** Full application testing after upgrades

---

## Current State

### Current Package Versions
```json
{
  "react": "18.2.0",
  "react-dom": "18.2.0",
  "next": "14.2.30",
  "tailwindcss": "3.3.3",
  "@types/react": "18.3.20",
  "@types/react-dom": "18.2.7",
  "@reduxjs/toolkit": "2.7.0",
  "react-redux": "9.2.0",
  "@remotion/player": "4.0.290",
  "@remotion/media-parser": "4.0.290",
  "typescript": "5.1.6"
}
```

### Current Tailwind Configuration
- **Config File:** `tailwind.config.ts` (TypeScript config)
- **CSS File:** `app/globals.css` (using `@tailwind` directives)
- **PostCSS:** `postcss.config.js` (standard Tailwind setup)
- **Custom Theme:**
  - Custom colors: `surfacePrimary`, `darkSurfacePrimary`
  - Custom gradients: `gradient-radial`, `gradient-conic`
  - Custom border color
- **Plugins:** None

---

## Target State

### Target Package Versions
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "next": "^15.5.0",
  "tailwindcss": "^4.1.16",
  "@types/react": "^19.2.2",
  "@types/react-dom": "^19.2.2",
  "@types/node": "^24.9.1",
  "@reduxjs/toolkit": "^2.5.0",
  "react-redux": "^9.2.0",
  "@remotion/player": "^4.0.369",
  "@remotion/media-parser": "^4.0.369",
  "typescript": "^5.9.3",
  "@types/uuid": "^11.0.0",
  "uuid": "^13.0.0",
  "autoprefixer": "^10.4.21",
  "postcss": "^8.5.6",
  "lucide-react": "^0.548.0",
  "eslint": "^9.38.0",
  "eslint-config-next": "^15.5.0"
}
```

### New Tailwind v4 Configuration
- **Config File:** ❌ Delete `tailwind.config.ts` (no longer needed)
- **CSS File:** `app/globals.css` (using `@import` and `@theme` directive)
- **PostCSS:** Update to use `@tailwindcss/postcss`
- **Custom Theme:** Migrate to CSS variables using `@theme` directive

---

## Phase 1: Package Updates

### 1.1 Update package.json

**Action:** Update all package versions in `package.json`

**Core Framework:**
- `react`: `18.2.0` → `^19.2.0`
- `react-dom`: `18.2.0` → `^19.2.0`
- `next`: `^14.2.30` → `^15.5.0`

**TypeScript Types:**
- `@types/react`: `^18.3.20` → `^19.2.2`
- `@types/react-dom`: `18.2.7` → `^19.2.2`
- `@types/node`: `20.4.9` → `^24.9.1`
- `@types/uuid`: `^10.0.0` → `^11.0.0`

**State Management:**
- `@reduxjs/toolkit`: `^2.7.0` → `^2.5.0` (already supports React 19)
- `react-redux`: `^9.2.0` → Keep (already supports React 19)

**Remotion:**
- `@remotion/player`: `^4.0.290` → `^4.0.369`
- `@remotion/media-parser`: `^4.0.290` → `^4.0.369`

**Tailwind & Build Tools:**
- `tailwindcss`: `3.3.3` → `^4.1.16`
- `autoprefixer`: `10.4.14` → `^10.4.21`
- `postcss`: `8.4.31` → `^8.5.6`

**Other Dependencies:**
- `typescript`: `5.1.6` → `^5.9.3`
- `uuid`: `^11.1.0` → `^13.0.0`
- `lucide-react`: `^0.503.0` → `^0.548.0`
- `eslint`: `8.46.0` → `^9.38.0`
- `eslint-config-next`: `13.4.13` → `^15.5.0`

**New Dependencies:**
- Add `@tailwindcss/postcss`: `^4.1.16` (devDependencies)

**Remove/Keep:**
- `basehub`: `^8.2.11` → Review if needed (has v9 available, breaking changes)

### 1.2 Install Updated Packages

**Command:**
```bash
npm install
```

**Expected Output:**
- All packages updated
- Dependency tree resolved
- No peer dependency conflicts (all packages support React 19)

---

## Phase 2: Tailwind CSS v4 Migration

### 2.1 Update postcss.config.js

**File:** `postcss.config.js`

**Current:**
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Updated:**
```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

**Changes:**
- Replace `tailwindcss` plugin with `@tailwindcss/postcss`

### 2.2 Update app/globals.css

**File:** `app/globals.css`

**Current:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

.moveable-origin {
    display: none !important;
}
.moveable-line.moveable-direction  {
    display: none !important;
}
```

**Updated:**
```css
@import "tailwindcss";

@theme {
  --color-surfacePrimary: oklch(.141 .005 285.823);
  --color-darkSurfacePrimary: oklch(.141 .005 285.823);
  --gradient-radial: radial-gradient(var(--tw-gradient-stops));
  --gradient-conic: conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops));
}

.moveable-origin {
  display: none !important;
}
.moveable-line.moveable-direction {
  display: none !important;
}
```

**Changes:**
- Replace `@tailwind` directives with single `@import "tailwindcss"`
- Add `@theme` directive to define custom CSS variables
- Migrate custom colors to `--color-*` format
- Migrate custom gradients as CSS variables
- Keep custom component styles unchanged

### 2.3 Delete tailwind.config.ts

**File:** `tailwind.config.ts`

**Action:** Delete this file completely

**Reason:** Tailwind v4 uses CSS-based configuration via `@theme` directive instead of JavaScript config files

### 2.4 Update Component Usage (If Needed)

**Custom Color Usage:**
- `bg-surfacePrimary` → Should work automatically with `--color-surfacePrimary`
- `text-darkSurfacePrimary` → Should work automatically with `--color-darkSurfacePrimary`

**Custom Gradient Usage:**
- `bg-gradient-radial` → May need to update to use CSS variable syntax
- `bg-gradient-conic` → May need to update to use CSS variable syntax

**Note:** Test all custom utility usage after migration

---

## Phase 3: Next.js 15 Configuration Updates

### 3.1 Update next.config.js

**File:** `next.config.js`

**Current:**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = nextConfig
```

**Updated:**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prepare for future Electron conversion
  output: 'export',
  images: {
    unoptimized: true
  },
  // Ensure compatibility with FFmpeg WASM
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  }
}

module.exports = nextConfig
```

**Changes:**
- Add `output: 'export'` for static site generation (required for Electron)
- Add `images.unoptimized: true` (required for static export)
- Add webpack config to handle FFmpeg WASM compatibility

**Rationale:**
- Prepares codebase for future Nextron/Electron conversion
- Ensures FFmpeg WASM assets are properly bundled
- No server-side features used (pure client-side app)

### 3.2 Verify Next.js 15 Compatibility

**Breaking Changes Review:**

1. **Async Request APIs:** ✅ Not affected (no API routes, no `cookies()`, `headers()`, `draftMode()`)
2. **Fetch Caching:** ✅ Not affected (client-side app, no server fetching)
3. **Route Handlers:** ✅ Not affected (no API routes)
4. **Client Router Cache:** ⚠️ May affect navigation performance (monitor after upgrade)

**Conclusion:** App architecture is compatible with Next.js 15

---

## Phase 4: Testing & Verification

### 4.1 Development Mode Testing

**Command:**
```bash
npm run dev
```

**Test Cases:**
1. ✅ App starts without errors
2. ✅ All pages load correctly
3. ✅ Tailwind styles render properly
4. ✅ Custom colors work (`surfacePrimary`, `darkSurfacePrimary`)
5. ✅ Custom gradients work (`gradient-radial`, `gradient-conic`)
6. ✅ Dark mode toggle functions
7. ✅ Redux state management works
8. ✅ Remotion player previews videos

### 4.2 Feature Testing

**Timeline Editor:**
- ✅ Timeline renders
- ✅ Drag and drop works
- ✅ Element positioning
- ✅ Timeline scrubbing

**Media Upload:**
- ✅ Upload video files
- ✅ Upload audio files
- ✅ Upload image files
- ✅ Generate thumbnails

**Video Editing:**
- ✅ Add text elements
- ✅ Add image elements
- ✅ Add audio elements
- ✅ Trim/split elements
- ✅ Adjust properties (opacity, position, volume)

**Preview & Render:**
- ✅ Remotion player works
- ✅ Real-time preview updates
- ✅ FFmpeg rendering works
- ✅ Export video (1080p, various formats)

### 4.3 Build Testing

**Command:**
```bash
npm run build
```

**Expected:**
- ✅ Build completes without errors
- ✅ Static export generated in `out/` directory
- ✅ All assets bundled correctly
- ✅ FFmpeg WASM files included

**Command:**
```bash
npm start
```

**Expected:**
- ✅ Production build serves correctly
- ✅ All features work in production mode

---

## Phase 5: Potential Issues & Mitigations

### 5.1 Tailwind v4 Breaking Changes

**Issue:** Utility class renames
- `shadow-sm` → `shadow-xs`
- `shadow` → `shadow-sm`
- `blur-sm` → `blur-xs`
- `outline-none` → `outline-hidden`

**Mitigation:**
- Search codebase for affected utilities
- Update manually or use find/replace

**Issue:** Border/ring color defaults changed to `currentColor`

**Mitigation:**
- Review border and ring usages
- Add explicit colors if needed

### 5.2 React 19 Changes

**Issue:** New React hooks behavior

**Mitigation:**
- Redux Toolkit 2.5.0+ fully supports React 19
- Remotion 4.0.369 fully supports React 19
- No direct hook usage changes needed

### 5.3 Next.js 15 Changes

**Issue:** Static export limitations

**Mitigation:**
- ✅ No API routes in current app
- ✅ No server-side features used
- ✅ Pure client-side rendering compatible

### 5.4 ESLint 9 Flat Config

**Issue:** ESLint 9 uses new flat config format

**Mitigation:**
- Update `.eslintrc.json` to `eslint.config.js` if needed
- Use `eslint-config-next@15` which handles compatibility
- May defer ESLint migration if blocking

---

## Phase 6: Rollback Plan

### If Upgrades Fail

**Option 1: Selective Rollback**
1. Keep React 19 + Next.js 15 if working
2. Rollback Tailwind v4 → v3 if CSS issues
3. Rollback individual packages causing errors

**Option 2: Full Rollback**
1. Restore `package.json` from backup or git history (user handles git)
2. Run `npm install`
3. Restore `tailwind.config.ts`, `postcss.config.js`, `app/globals.css` from backup
4. Remove `next.config.js` changes

**Note:**
- User will handle all git operations (commits, branches, reverts)
- Assistant will only modify files, never interact with git/GitHub

---

## Phase 7: Post-Upgrade Tasks

### 7.1 Documentation Updates

- ✅ Update README.md with new package versions
- ✅ Update TODO.md if any items affected
- ✅ Document Tailwind v4 migration in architecture.md

### 7.2 Dependency Audit

**Command:**
```bash
npm audit
```

**Action:** Review and fix any security vulnerabilities

### 7.3 Bundle Size Analysis

**Command:**
```bash
npm run build
```

**Action:**
- Compare bundle sizes before/after
- Verify no significant size increases
- Check if Tailwind v4 reduces CSS size (expected)

---

## Success Criteria

### Must Have (Blocking)
- ✅ App builds without errors
- ✅ App runs in development mode
- ✅ All core features work (timeline, preview, render)
- ✅ Tailwind styles render correctly
- ✅ No console errors in browser

### Should Have (Non-blocking)
- ✅ Bundle size maintained or reduced
- ✅ No performance regressions
- ✅ All custom Tailwind utilities work
- ✅ Dark mode works correctly

### Nice to Have
- ✅ Improved build times (Tailwind v4)
- ✅ Improved dev server startup (Next.js 15)
- ✅ Better TypeScript support (TS 5.9)

---

## Execution Checklist

- [ ] 1. **[USER]** Create git checkpoint and branch if desired
- [ ] 2. Update `package.json` with new versions
- [ ] 3. Run `npm install`
- [ ] 4. Update `postcss.config.js`
- [ ] 5. Update `app/globals.css`
- [ ] 6. Delete `tailwind.config.ts`
- [ ] 7. Update `next.config.js`
- [ ] 8. Run `npm run dev` and test
- [ ] 9. Fix any errors or breaking changes
- [ ] 10. Run `npm run build` and verify
- [ ] 11. Test production build
- [ ] 12. Run full feature testing
- [ ] 13. **[USER]** Commit and merge changes if successful

**Note:** Steps marked **[USER]** are handled by the user. Assistant will not use git commands.

---

## Timeline Estimate

- **Phase 1 (Package Updates):** 15 minutes
- **Phase 2 (Tailwind Migration):** 30 minutes
- **Phase 3 (Next.js Config):** 15 minutes
- **Phase 4 (Testing):** 45-60 minutes
- **Phase 5 (Bug Fixes):** 30-60 minutes (if needed)

**Total Estimated Time:** 2-3 hours

---

## Notes

### Why These Versions?

**React 19.2.0:**
- Latest stable React
- Full ecosystem support now available
- Better performance and new features

**Next.js 15.5:**
- Stable production release
- Requires React 19
- Skip Next.js 16 (too new, released Oct 2025)
- Better Turbopack support

**Tailwind v4:**
- Modern CSS-based configuration
- Better performance
- Smaller CSS output
- No preprocessor dependencies

### Why Not Later?

**Next.js 16:**
- Too new (October 2025 release)
- Not enough production testing
- Next.js 15.5 is stable and mature

**Tailwind v5:**
- Doesn't exist yet
- v4 is latest stable

### Dependencies Verified

**Remotion:** v4.0.236+ supports React 19 ✅
**Redux Toolkit:** v2.5.0+ supports React 19 ✅
**React Redux:** v9.1.0+ supports React 19 ✅
**FFmpeg WASM:** No React version dependency ✅

---

## References

- [Remotion React 19 Support](https://www.remotion.dev/docs/react-19)
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Tailwind CSS v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
- [Redux Toolkit Releases](https://github.com/reduxjs/redux-toolkit/releases)
- [React 19 Release Notes](https://react.dev/blog/2025/10/01/react-19-2)
