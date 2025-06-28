import { NBrowser } from '../n-browser-interface';

module.exports = {
  async command(this: NBrowser, pluginName: string = 'API Test Plugin') {
    return this.navigateToPluginSettings()
      .pause(1000)
      .execute(
        (name: string) => {
          const cards = Array.from(
            document.querySelectorAll('plugin-management mat-card'),
          );
          const targetCard = cards.find((card) => {
            const title = card.querySelector('mat-card-title')?.textContent || '';
            return title.includes(name);
          });

          if (targetCard) {
            const toggleButton = targetCard.querySelector(
              'mat-slide-toggle button[role="switch"]',
            ) as HTMLButtonElement;
            if (toggleButton) {
              const wasChecked = toggleButton.getAttribute('aria-checked') === 'true';
              if (!wasChecked) {
                toggleButton.click();
              }
              return {
                enabled: true,
                found: true,
                wasChecked,
                nowChecked: toggleButton.getAttribute('aria-checked') === 'true',
                clicked: !wasChecked,
              };
            }
            return { enabled: false, found: true, error: 'No toggle found' };
          }

          return { enabled: false, found: false };
        },
        [pluginName],
        (result) => {
          const data = result.value as any;
          this.assert.ok(data.found, `Plugin "${pluginName}" should be found`);
          console.log(`Plugin "${pluginName}" enable state:`, data);
        },
      )
      .pause(2000); // Wait for plugin to initialize
  },
};
