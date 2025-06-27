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

        // Find by card title or card content
        const pluginItem = items.find((item) => {
          const cardTitle = item.querySelector('mat-card-title')?.textContent || '';
          const cardContent = item.textContent || '';
          return cardTitle.includes(name) || cardContent.includes(name);
        });

        if (!pluginItem) {
          return {
            found: false,
            debug: {
              totalCards: items.length,
              cardTitles: items.map(
                (item) =>
                  item.querySelector('mat-card-title')?.textContent?.trim() || 'No title',
              ),
              searchName: name,
            },
          };
        }

        // Check if toggle is checked - Angular Material slide toggle
        const toggleInput = pluginItem.querySelector(
          'mat-slide-toggle input',
        ) as HTMLInputElement;

        let enabled = false;
        if (toggleInput) {
          enabled = toggleInput.checked;
        }

        return {
          found: true,
          enabled,
          name: pluginItem.querySelector('mat-card-title')?.textContent?.trim() || '',
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
