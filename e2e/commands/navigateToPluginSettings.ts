import { NightwatchBrowser } from 'nightwatch';
import { cssSelectors } from '../e2e.const';

const { SIDENAV } = cssSelectors;
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;

module.exports = {
  async command(this: NightwatchBrowser) {
    return this.click(SETTINGS_BTN)
      .pause(1000)
      .execute(() => {
        // Scroll to plugins section
        const pluginSection = document.querySelector('.plugin-section');
        if (pluginSection) {
          pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Make sure collapsible is expanded
        const collapsible = document.querySelector('.plugin-section collapsible');
        if (collapsible && !collapsible.classList.contains('isExpanded')) {
          const toggleBtn = collapsible.querySelector('.collapsible-title-wrapper');
          if (toggleBtn) {
            (toggleBtn as HTMLElement).click();
          }
        }
      })
      .pause(1000)
      .waitForElementVisible('plugin-management', 5000);
  },
};
