(function() {
  'use strict';

  angular
    .module('superProductivity')
    .animation('.ani-crawl-in-out', slideAnimation);

  const DUR_ENTER = 0.225;
  const DUR_LEAVE = 0.195;
  const EASE_ENTER = 'cubic-bezier(0, 0, .2, 1)';
  const EASE_LEAVE = 'cubic-bezier(.4, 0, 1, 1)';

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
          duration: DUR_ENTER,
          easing: EASE_ENTER,
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
          duration: DUR_LEAVE,
          easing: EASE_LEAVE,
          cleanupStyles: true
        });
      }
    };
  }
}());


