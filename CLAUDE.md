# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PromptCraft** is a Chrome/Edge browser extension for managing AI prompts with cloud synchronization. Built as a pure JavaScript application (no frameworks) using Manifest V3, it follows a local-first architecture with optional Supabase cloud sync.

## Development Commands

This is a **zero-build** extension - no build tools, no test framework, no linting.

### Loading the Extension
```bash
# Manual process in Chrome/Edge:
# 1. Navigate to edge://extensions/ or chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the project root directory
```

### Testing Changes
- Reload the extension in the browser extensions page (click refresh button or `Ctrl+R`)
- No automated testing - manual testing required

## Architecture

### Layer Structure
```
┌─────────────────────────────────────────────────────────────┐
│  UI Layer (sidepanel/)                                       │
│  - sidepanel.html → sidepanel.js → appController.js         │
│  - uiManager.js (DOM operations)                            │
│  - tagComponentManager.js (tag inputs)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Business Logic Layer (appController.js)                    │
│  - State management, event handling, business logic         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Service Layer (utils/)                                     │
│  - data-service.js      (Chrome Storage API abstraction)    │
│  - auth-service.js      (Supabase authentication)           │
│  - sync-service.js      (Cloud synchronization)             │
│  - auth-handler.js      (Auth state management)             │
│  - json-utils.js        (JSON validation)                   │
│  - uuid.js              (UUID generation)                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Background Layer                                           │
│  - background.js         (Service worker, extension lifecycle)│
│  - content_script.js     (Page injection for "pp" command)   │
└─────────────────────────────────────────────────────────────┘
```

### Key Files
- [manifest.json](manifest.json) - Extension configuration (Manifest V3)
- [src/background.js](src/background.js) - Service worker entry point
- [src/sidepanel/appController.js](src/sidepanel/appController.js) - Business logic controller
- [src/utils/data-service.js](src/utils/data-service.js) - Primary data access layer
- [src/utils/sync-service.js](src/utils/sync-service.js) - Cloud sync logic
- [src/utils/auth-service.js](src/utils/auth-service.js) - Authentication management

### Communication Architecture
- **Message-driven**: Background script manages core services; UI communicates via `chrome.runtime.sendMessage`
- **Service singletons**: Services are instantiated once in background to prevent multi-instance conflicts
- **Context isolation**: Content script injects "pp" command handler into web pages

### Data Flow
1. Chrome Storage API (local) = primary data source
2. Supabase (cloud) = optional backup/sync
3. `data-service.js` provides unified CRUD interface
4. Mixed sync strategy: local changes push immediately, cloud changes poll every 10 minutes

## Version Update Workflow

When releasing a new version, **5 files must be updated**:

### 1. Version Number Files (3 files)

**[manifest.json](manifest.json)** (line 5)
```json
"version": "1.4.0"
```
Chrome/Edge extension version - must follow semantic versioning (MAJOR.MINOR.PATCH)

**[package.json](package.json)** (line 3)
```json
"version": "1.4.0"
```
NPM package version - should match manifest.json

**[assets/data/version-log.json](assets/data/version-log.json)**
```json
{
  "currentVersion": "1.4.0",
  "lastViewedVersion": "1.3.8",
  "versions": [
    {
      "version": "1.4.0",
      "date": "2026-01-20",
      "title": "Brief title for the update",
      "changes": [
        "🐛 Description of changes",
        "⚡ More changes"
      ]
    }
  ]
}
```
- Update `currentVersion` to new version
- Update `lastViewedVersion` to previous version
- Add new version entry to `versions` array

### 2. English i18n Files (2 files)

**[assets/data/version-log-en.json](assets/data/version-log-en.json)**
- Same structure as version-log.json
- English translations of all version entries

**[_locales/en/messages.json](_locales/en/messages.json)**
- Only update if new UI strings are added with the version

### Version Update Checklist
1. ✅ Update [manifest.json](manifest.json) version
2. ✅ Update [package.json](package.json) version
3. ✅ Update [assets/data/version-log.json](assets/data/version-log.json) (currentVersion, lastViewedVersion, add new version entry)
4. ✅ Update [assets/data/version-log-en.json](assets/data/version-log-en.json) with English translations
5. ✅ Test by reloading extension in Chrome/Edge

## Code Style Conventions

- **Async/await** preferred over Promises
- **JSDoc comments** for function documentation
- **camelCase** for variables and functions
- **PascalCase** for classes/constructors
- **UPPER_CASE** for constants
- File naming: kebab-case for utilities, descriptive names for components

## Key Dependencies

- **Supabase** ([src/libs/supabase.min.js](src/libs/supabase.min.js)) - Local copy, no CDN
- **Font Awesome** - CDN: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`
- No build tools (no webpack, rollup, parcel)
- No frameworks (no React, Vue, etc.)

## Internationalization

- Chrome extension i18n via `chrome.i18n.getMessage()`
- Locale files in `_locales/` directory
- Supported languages: `zh_CN` (primary), `en`
- Version logs have separate Chinese/English JSON files

## Quick Reference for Common Tasks

### Adding a new feature
1. Update UI in [src/sidepanel/](src/sidepanel/) as needed
2. Add business logic to [appController.js](src/sidepanel/appController.js)
3. Add service layer functions to [src/utils/](src/utils/) if needed
4. Update i18n files if new UI strings are added

### Modifying storage behavior
- Edit [data-service.js](src/utils/data-service.js) for data access patterns
- Chrome Storage API is the single source of truth
- Sync logic is in [sync-service.js](src/utils/sync-service.js)

### Updating authentication
- [auth-service.js](src/utils/auth-service.js) handles Supabase auth
- [auth-handler.js](src/utils/auth-handler.js) manages auth state in background
- Uses Chrome Identity API for Google OAuth

### Styling changes
- CSS variables for themes in [base.css](src/sidepanel/css/base.css)
- Component styles in [components.css](src/sidepanel/css/components.css)
- Layout in [layout.css](src/sidepanel/css/layout.css)
- All styles imported via [main.css](src/sidepanel/css/main.css)

## Important Notes

- **Local-first architecture**: All features work offline; cloud sync is optional
- **No build step**: Files load directly, no transpilation needed
- **Manifest V3**: Uses service worker instead of background pages
- **Content Security**: No inline scripts; CSP-compliant
- **"pp" command**: Content script injects quick-invocation handler into all web pages
- **Skeleton loading**: Uses skeleton screens (not spinners) for perceived performance
