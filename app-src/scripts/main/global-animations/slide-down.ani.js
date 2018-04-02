(function() {
  'use strict';

  angular
    .module('superProductivity')
    .animation('.ani-slide-up-down', slideAnimation);

  const DUR = 0.2;
  const EASE = 'cubic-bezier(.38, .04, .35, .96)';

  const animationSpeed = (height) => {
    if (height >= 450) {
      return DUR * 1.5;
    } else if (height > 200 && height < 450) {
      return DUR * 1.5;
    } else {
      return DUR;
    }
  };

  /* @ngInject */
  function slideAnimation($animateCss) {
    return {
      enter: function($el) {
        const el = $el[0];
        //const sh = el.scrollHeight;
        const height = el.offsetHeight;
        return $animateCss($el, {
          from: { height: '0px' },
          to: { height: height + 'px' },
          duration: animationSpeed(height),
          easing: EASE,
          cleanupStyles: true
        });
      },
      leave: ($el) => {
        const el = $el[0];
        //const sh = el.scrollHeight;
        const height = el.offsetHeight;
        return $animateCss($el, {
          from: { height: height + 'px', opacity: 1 },
          to: { height: '0px', opacity: 0 },
          duration: animationSpeed(height),
          easing: EASE,
          cleanupStyles: true
        });
      }
    }
  }
}());


