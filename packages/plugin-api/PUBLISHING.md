# Publishing @super-productivity/plugin-api

## Overview

This package provides TypeScript definitions for Super Productivity plugin development. It's published to npm as `@super-productivity/plugin-api`.

## Publishing Process

### 1. Update Version

Update the version in `package.json`:

```bash
cd packages/plugin-api
npm version patch   # or minor/major
```

### 2. Build the Package

```bash
npm run build
```

### 3. Test the Build

```bash
npm pack --dry-run
```

### 4. Publish to npm

For stable releases:

```bash
npm publish --access public
```

For beta releases:

```bash
npm publish --tag beta --access public
```

## Project Integration

### Updating the Main Project

When updating the plugin API types, you need to:

1. **Update this package** with new types/interfaces
2. **Rebuild the package**: `npm run build`
3. **Update the main project** to use the new types from this package instead of local definitions
4. **Test the integration** to ensure everything works

### Using in the Main Project

The main project should import types from this package:

```typescript
// Instead of local imports:
// import { PluginManifest } from './plugin-api.model';

// Use the npm package:
import type { PluginManifest } from '@super-productivity/plugin-api';
```

## Package Structure

```
packages/plugin-api/
├── src/
│   ├── index.ts      # Main export file
│   └── types.ts      # All type definitions
├── dist/             # Built output (generated)
├── package.json      # Package configuration
├── tsconfig.json     # TypeScript configuration
├── README.md         # User documentation
├── PUBLISHING.md     # This file
└── .npmignore        # Files to exclude from npm
```

## Maintenance

- Keep types in sync with the main project's plugin system
- Update documentation when adding new features
- Follow semantic versioning for releases
- Test changes with actual plugin development

## Version History

- `1.0.0` - Initial release with core plugin API types
