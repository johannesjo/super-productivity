(function() {
  'use strict';

  angular
    .module('superProductivity')
    .animation('.ani-crawl-in-out', slideAnimation);

  const DUR = .2;
  const EASE = 'ease-in-out';

  /* @ngInject */
  function slideAnimation($animateCss) {
    return {
      enter: function($el) {
        const el = $el[0];
        //const sh = el.scrollHeight;
        const maxHeight = el.offsetHeight;
        return $animateCss($el, {
          from: {
            maxHeight: '0',
            transform: 'scaleY(0)',
          },
          to: {
            maxHeight: maxHeight + 'px',
            transform: 'scale(1)',
          },
          duration: DUR,
          easing: EASE,
          cleanupStyles: true
        });
      },
      leave: ($el) => {
        const el = $el[0];
        //const sh = el.scrollHeight;
        const maxHeight = el.offsetHeight;
        return $animateCss($el, {
          from: {
            maxHeight: maxHeight + 'px',
            transform: 'scale(1)',
          },
          to: {
            maxHeight: '0',
            transform: 'scale(0)',
          },
          duration: DUR,
          easing: EASE,
          cleanupStyles: true
        });
      }
    };
  }
}());


