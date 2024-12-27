/** @type {import('stylelint').Config} */
export default {
  extends: 'stylelint-config-recommended-scss',
  rules: {
    'no-empty-source': null,
    'block-no-empty': [true, { severity: 'warning' }],
    'no-descending-specificity': null,
    'selector-type-no-unknown': null, // stylelint doesn't recognize angular components
    'scss/comment-no-empty': null, // allow for double slash multiline comments
    'scss/load-no-partial-leading-underscore': null, // this project uses underscored files
    'scss/operator-no-newline-after': null, // prettier conficts with this rule
    'scss/operator-no-unspaced': null, // code style not error
    'scss/load-partial-extension': null, // it's code style not an error
    'selector-pseudo-element-no-unknown': [
      true,
      {
        ignorePseudoElements: ['ng-deep'],
      },
    ],
  },
};
