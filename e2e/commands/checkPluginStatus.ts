import { NightwatchBrowser } from 'nightwatch';

module.exports = {
  async command(
    this: NightwatchBrowser,
    pluginName: string,
    expectedEnabled: boolean = true,
  ) {
    return this.waitForElementVisible('plugin-management').execute(
      (name: string) => {
        // Find the plugin item (now in mat-card elements)
        const items = Array.from(document.querySelectorAll('plugin-management mat-card'));
        const pluginItem = items.find((item) => item.textContent?.includes(name));

        if (!pluginItem) {
          return {
            found: false,
            debug: {
              totalCards: items.length,
              cardTexts: items.map((item) => item.textContent?.trim().substring(0, 50)),
              searchName: name,
            },
          };
        }

        // Check if toggle is checked - use button for new Angular Material switches
        const toggleInput = pluginItem.querySelector(
          '.mat-mdc-slide-toggle input',
        ) as HTMLInputElement;
        const toggleButton = pluginItem.querySelector(
          '.mat-mdc-slide-toggle button[role="switch"]',
        ) as HTMLButtonElement;

        let enabled = false;
        if (toggleInput) {
          enabled = toggleInput.checked;
        } else if (toggleButton) {
          enabled = toggleButton.getAttribute('aria-checked') === 'true';
        }

        return {
          found: true,
          enabled,
          name: pluginItem.textContent?.trim(),
        };
      },
      [pluginName],
      (result) => {
        const data = result.value as any;
        if (!data.found && data.debug) {
          console.log('Plugin not found. Debug info:', data.debug);
        }
        this.assert.ok(data.found, `Plugin "${pluginName}" should be found`);
        if (data.found) {
          this.assert.equal(
            data.enabled,
            expectedEnabled,
            `Plugin "${pluginName}" should be ${expectedEnabled ? 'enabled' : 'disabled'}`,
          );
        }
      },
    );
  },
};
