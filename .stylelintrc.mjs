/** @type {import('stylelint').Config} */
export default {
  extends: 'stylelint-config-recommended-scss',
  rules: {
    'no-empty-source': null,
    'no-descending-specificity': null,
    'selector-pseudo-element-no-unknown': [
      true,
      {
        ignorePseudoElements: ['ng-deep'],
      },
    ],
  },
};
