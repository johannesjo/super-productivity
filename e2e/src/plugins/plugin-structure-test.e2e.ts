/* eslint-disable @typescript-eslint/naming-convention */
import { NBrowser } from '../../n-browser-interface';

module.exports = {
  '@tags': ['plugins', 'structure'],

  before: (browser: NBrowser) => browser.loadAppAndClickAwayWelcomeDialog(),

  after: (browser: NBrowser) => browser.end(),

  'check plugin card structure': (browser: NBrowser) =>
    browser
      .navigateToPluginSettings()
      .pause(1000)
      .execute(
        () => {
          const cards = Array.from(
            document.querySelectorAll('plugin-management mat-card'),
          );
          const apiTestCard = cards.find((card) => {
            const title = card.querySelector('mat-card-title')?.textContent || '';
            return title.includes('API Test Plugin');
          });

          if (!apiTestCard) {
            return { found: false };
          }

          // Look for all possible toggle selectors
          const toggleSelectors = [
            'mat-slide-toggle input',
            'mat-slide-toggle button',
            '.mat-mdc-slide-toggle input',
            '.mat-mdc-slide-toggle button',
            '[role="switch"]',
            'input[type="checkbox"]',
          ];

          const toggleResults = toggleSelectors.map((selector) => ({
            selector,
            found: !!apiTestCard.querySelector(selector),
            element: apiTestCard.querySelector(selector)?.tagName,
          }));

          // Get the card's inner HTML structure
          const cardStructure = apiTestCard.innerHTML.substring(0, 500);

          return {
            found: true,
            cardTitle: apiTestCard.querySelector('mat-card-title')?.textContent,
            toggleResults,
            cardStructure,
            hasMatSlideToggle: !!apiTestCard.querySelector('mat-slide-toggle'),
            allInputs: Array.from(apiTestCard.querySelectorAll('input')).map((input) => ({
              type: input.type,
              id: input.id,
              class: input.className,
            })),
          };
        },
        [],
        (result) => {
          console.log('Plugin card structure:', JSON.stringify(result.value, null, 2));
        },
      ),
};
