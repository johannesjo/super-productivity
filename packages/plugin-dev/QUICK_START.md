# Plugin Development Quick Start

## Option 1: Plain JavaScript (Simplest)

```bash
cd minimal-plugin
# Edit plugin.js
# Zip the files and upload
```

**Pros:** No build step, instant feedback
**Cons:** No TypeScript, no bundling

## Option 2: Simple TypeScript (Recommended)

```bash
cd simple-typescript-plugin
npm install
npm run build
# Find plugin.zip in dist/
```

**Pros:** TypeScript support, simple build
**Cons:** Limited to single file

## Option 3: Full TypeScript + Webpack (Advanced)

```bash
cd example-plugin
npm install
npm run build
npm run package
```

**Pros:** Multiple files, full tooling
**Cons:** More complex setup

## Which Should I Use?

- **Just testing?** → Use minimal-plugin
- **Want TypeScript?** → Use simple-typescript-plugin
- **Building complex plugin?** → Use example-plugin

## Development Tips

1. Start with minimal-plugin to understand the API
2. Move to TypeScript when you need type safety
3. Only use webpack if you need multiple source files

## Testing Your Plugin

1. Copy files to `src/assets/my-plugin/` for local testing
2. Or zip and upload via Settings → Plugins

That's it! 🚀
