import { NightwatchBrowser } from 'nightwatch';
import { cssSelectors } from '../e2e.const';

const { SIDENAV } = cssSelectors;
const SETTINGS_BTN = `${SIDENAV} .tour-settingsMenuBtn`;

module.exports = {
  async command(this: NightwatchBrowser) {
    return this.click(SETTINGS_BTN)
      .pause(1000)
      .execute(() => {
        // First ensure we're on the config page
        const configPage = document.querySelector('.page-settings');
        if (!configPage) {
          console.error('Not on config page');
          return;
        }

        // Scroll to plugins section
        const pluginSection = document.querySelector('.plugin-section');
        if (pluginSection) {
          pluginSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.error('Plugin section not found');
          return;
        }

        // Make sure collapsible is expanded - click the header to toggle
        const collapsible = document.querySelector('.plugin-section collapsible');
        if (collapsible) {
          const isExpanded = collapsible.classList.contains('isExpanded');
          if (!isExpanded) {
            // Click the collapsible header to expand it
            const header = collapsible.querySelector('.collapsible-header');
            if (header) {
              (header as HTMLElement).click();
              console.log('Clicked to expand plugin collapsible');
            } else {
              console.error('Could not find collapsible header');
            }
          } else {
            console.log('Plugin collapsible already expanded');
          }
        } else {
          console.error('Plugin collapsible not found');
        }
      })
      .pause(1000)
      .waitForElementVisible('plugin-management', 5000);
  },
};
