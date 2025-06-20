#!/bin/bash

# Remove old plugin files after KISS refactoring
echo "Removing old plugin files..."

# Old service files
rm -f src/app/plugins/plugin-cleanup.old.service.ts
rm -f src/app/plugins/plugin-cache.old.service.ts
rm -f src/app/plugins/plugin-loader.old.service.ts

# Old TypeScript files
rm -f src/app/plugins/plugin-hooks.old.ts
rm -f src/app/plugins/plugin-security.old.ts
rm -f src/app/plugins/plugin-runner.old.ts

# Old util files
rm -f src/app/plugins/util/validate-manifest.old.util.ts

# Compression utilities (no longer used)
rm -f src/app/plugins/plugin-compression.util.ts
rm -f src/app/plugins/plugin-compression.util.spec.ts

# Old consent dialog
rm -f src/app/plugins/ui/plugin-node-consent-dialog/plugin-node-consent-dialog.component.ts

# Old electron file
rm -f electron/plugin-node-executor.old.ts

# Remove the file listing old files
rm -f src/app/plugins/OLD_FILES_TO_REMOVE.txt

echo "Cleanup complete!"