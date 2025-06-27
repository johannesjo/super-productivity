import { NightwatchBrowser } from 'nightwatch';

module.exports = {
  async command(this: NightwatchBrowser, pluginName: string = 'API Test Plugin') {
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
            const toggleInput = targetCard.querySelector(
              'mat-slide-toggle input',
            ) as HTMLInputElement;
            if (toggleInput && !toggleInput.checked) {
              toggleInput.click();
              return { enabled: true, found: true };
            }
            return { enabled: toggleInput?.checked || false, found: true };
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
