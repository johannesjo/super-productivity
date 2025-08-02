#!/bin/bash

# Fix common patterns in plugin tests

# Pattern 1: Replace waitForTimeout after page.click(SETTINGS_BTN)
find tests/plugins -name "*.spec.ts" -exec sed -i 's/await page\.click(SETTINGS_BTN);$/await page.click(SETTINGS_BTN);/g' {} \;
find tests/plugins -name "*.spec.ts" -exec sed -i '/await page\.click(SETTINGS_BTN);/{n;s/^    await page\.waitForTimeout(1000);$/    await page.waitForLoadState("networkidle");/;}' {} \;

# Pattern 2: Replace waitForTimeout after navigation  
find tests/plugins -name "*.spec.ts" -exec sed -i 's/await page\.waitForTimeout(100);$/await page.waitForLoadState("domcontentloaded");/g' {} \;

# Pattern 3: Replace longer timeouts (2000-3000ms) with proper waits
find tests/plugins -name "*.spec.ts" -exec sed -i 's/await page\.waitForTimeout(3000);/await page.waitForLoadState("networkidle");/g' {} \;
find tests/plugins -name "*.spec.ts" -exec sed -i 's/await page\.waitForTimeout(2000);/await page.waitForLoadState("networkidle");/g' {} \;

# Pattern 4: Replace 500ms timeouts with shorter ones or remove
find tests/plugins -name "*.spec.ts" -exec sed -i 's/await page\.waitForTimeout(500);/await page.waitForLoadState("domcontentloaded");/g' {} \;

echo "Fixed common timeout patterns in plugin tests"