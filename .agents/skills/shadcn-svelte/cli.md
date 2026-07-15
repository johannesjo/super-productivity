# shadcn-svelte CLI Reference

Configuration is read from `components.json`. See [components.json](https://shadcn-svelte.com/docs/components-json) on the docs site for the full schema.

> **IMPORTANT:** Always run commands using the project's package runner: `npx shadcn-svelte@latest`, `pnpm dlx shadcn-svelte@latest`, or `bunx --bun shadcn-svelte@latest`. Check `packageManager` from the project (or lockfile) to choose the right one. Examples below use `npx shadcn-svelte@latest` but substitute the correct runner for the project.

> **IMPORTANT:** Only use the flags documented below. Do not invent or guess flags — if a flag isn't listed here, it doesn't exist. The CLI auto-detects the package manager; there is no `--package-manager` flag.

## Contents

- Commands: `init`, `add`, `apply`, `update`, `registry build`
- Proxy / outgoing requests
- Presets (via `init` and `apply`)

---

## Commands

### `init` — Initialize an existing project

```bash
npx shadcn-svelte@latest init [options]
```

Installs dependencies, adds the `cn` util, creates `components.json`, and sets up CSS variables. Run `init` from the root of your project.

| Flag                        | Short | Description                                                               | Default   |
| --------------------------- | ----- | ------------------------------------------------------------------------- | --------- |
| `--preset <preset>`         | —     | Encoded design-system preset string from the docs site                    | —         |
| `-c, --cwd <path>`          | `-c`  | Working directory                                                         | current   |
| `-o, --overwrite`           | —     | Overwrite existing files                                                  | `false`   |
| `--no-deps`                 | —     | Do not add or install dependencies                                        | —         |
| `--skip-preflight`          | —     | Ignore preflight checks and continue                                      | `false`   |
| `--base-color <name>`       | —     | Base color: `neutral`, `stone`, `zinc`, `mauve`, `olive`, `mist`, `taupe` | —         |
| `--css <path>`              | —     | Path to the global CSS file                                               | —         |
| `--components-alias <path>` | —     | Import alias for components                                               | —         |
| `--lib-alias <path>`        | —     | Import alias for lib                                                      | —         |
| `--utils-alias <path>`      | —     | Import alias for utils                                                    | —         |
| `--hooks-alias <path>`      | —     | Import alias for hooks                                                    | —         |
| `--ui-alias <path>`         | —     | Import alias for UI components                                            | —         |
| `--proxy <proxy>`           | —     | Fetch registry items through this proxy                                   | env-based |
| `--design-system-url`       | —     | Optional design-system URL (see docs / preset builder)                    | —         |
| `-h, --help`                | `-h`  | Help                                                                      | —         |

---

### `add` — Add components

```bash
npx shadcn-svelte@latest add [options] [components...]
```

Adds components from the configured registry. Arguments are component names from the registry index, or a **URL** to a registry JSON item. With **no** component names, the CLI prompts you to pick components interactively.

| Flag               | Short | Description                                     | Default   |
| ------------------ | ----- | ----------------------------------------------- | --------- |
| `-c, --cwd <path>` | `-c`  | Working directory                               | current   |
| `--no-deps`        | —     | Skip adding and installing package dependencies | —         |
| `--skip-preflight` | —     | Ignore preflight checks and continue            | `false`   |
| `-a, --all`        | —     | Install all UI components                       | `false`   |
| `-y, --yes`        | —     | Skip confirmation prompt                        | `false`   |
| `-o, --overwrite`  | —     | Overwrite existing files                        | `false`   |
| `--proxy <proxy>`  | —     | Fetch components through this proxy             | env-based |
| `-h, --help`       | `-h`  | Help                                            | —         |

---

### `apply` — Apply a preset to an existing project

```bash
npx shadcn-svelte@latest apply [options]
```

Applies a design-system preset to a project that has already been initialized. Updates `components.json` with the preset settings, reinstalls existing components (except `utils`) with the new styles, and installs any required dependencies.

Use `--only theme` or `--only font` to apply only part of a preset without reinstalling UI components.

Get a preset code from the builder at [shadcn-svelte.com/create](https://shadcn-svelte.com/create).

| Flag                | Short | Description                                    | Default   |
| ------------------- | ----- | ---------------------------------------------- | --------- |
| `--preset <preset>` | —     | Encoded design-system preset string (required) | —         |
| `--only [parts]`    | —     | Apply only `theme` or `font` from the preset   | —         |
| `-c, --cwd <path>`  | `-c`  | Working directory                              | current   |
| `-y, --yes`         | `-y`  | Overwrite existing files without confirmation  | `false`   |
| `-s, --silent`      | `-s`  | Mute output                                    | `false`   |
| `--skip-preflight`  | —     | Ignore preflight checks and continue           | `false`   |
| `--proxy <proxy>`   | —     | Fetch registry items through this proxy        | env-based |
| `-h, --help`        | `-h`  | Help                                           | —         |

Requires an existing `components.json`. Run `init` first if the project is not yet configured.

---

### `update` — Update installed components

```bash
npx shadcn-svelte@latest update [options] [components...]
```

Re-fetches and applies registry content for components **already present** in the project. Run `shadcn-svelte update --help` for options.

| Flag               | Short | Description                                     | Default   |
| ------------------ | ----- | ----------------------------------------------- | --------- |
| `-c, --cwd <path>` | `-c`  | Working directory                               | current   |
| `--skip-preflight` | —     | Ignore preflight checks and continue            | `false`   |
| `--no-deps`        | —     | Skip adding and installing package dependencies | —         |
| `-a, --all`        | —     | Update every installed component                | `false`   |
| `-y, --yes`        | —     | Skip confirmation prompt                        | `false`   |
| `--proxy <proxy>`  | —     | Fetch through this proxy                        | env-based |
| `-h, --help`       | `-h`  | Help                                            | —         |

Commit your work before updating; overwrites are destructive.

---

### `registry build` — Build a custom registry

```bash
npx shadcn-svelte@latest registry build [options] [registry]
```

Reads a `registry.json` and writes registry JSON files for distribution. Default input: `./registry.json`, default output: `./static/r`.

| Flag                  | Short | Description                     | Default      |
| --------------------- | ----- | ------------------------------- | ------------ |
| `-c, --cwd <path>`    | `-c`  | Working directory               | current      |
| `-o, --output <path>` | `-o`  | Output directory for JSON files | `./static/r` |
| `-h, --help`          | `-h`  | Help                            | —            |

---

## Outgoing Requests

### Proxy

The CLI can fetch the registry through a proxy. If `HTTP_PROXY` or `http_proxy` is set, requests respect it. You can also pass `--proxy` on `init`, `add`, `apply`, or `update`.

```bash
HTTP_PROXY="<proxy-url>" npx shadcn-svelte@latest init
```

---

## Presets

Design-system options (style, theme, icons, fonts, etc.) can be captured as an encoded **preset** string from the builder on [shadcn-svelte.com/create](https://shadcn-svelte.com/create).

- **New project:** pass the preset to **`init`** with `--preset <string>`.
- **Existing project:** use **`apply --preset <string>`** to update configuration, restyle installed components, and install any new dependencies.

---

## `components.json` — useful fields for agents

| Field / path         | Meaning                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `tailwind.css`       | Global CSS file path (Tailwind entry / theme variables)          |
| `tailwind.baseColor` | Base palette (cannot change after init)                          |
| `aliases.*`          | Import aliases; must match `svelte.config.js` / `tsconfig` paths |
| `registry`           | Base registry URL (default `https://shadcn-svelte.com/registry`) |
| `style`              | Registered style name (e.g. `nova`, `vega`, …)                   |
| `iconLibrary`        | Icon set key (`lucide`, `tabler`, …) — drives generated imports  |
| `typescript`         | Whether TS and optional custom config path                       |

Resolved paths (including `tailwindCss`, `ui`, `components`) are computed by the CLI from `components.json` and the filesystem. Read `components.json` and list the UI directory when you need a snapshot of what is installed.
