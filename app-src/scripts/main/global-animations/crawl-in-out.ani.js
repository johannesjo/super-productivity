(function() {
  'use strict';

  angular
    .module('superProductivity')
    .animation('.ani-crawl-in-out', slideAnimation);

  const DUR = .2;
  const EASE = 'cubic-bezier(.38, .04, .35, .96)';

  const animationSpeed = (maxHeight) => {
    return DUR;
    //if (maxHeight >= 450) {
    //  return DUR * 1.25;
    //} else if (maxHeight > 200 && maxHeight < 450) {
    //  return DUR;
    //} else {
    //  return DUR;
    //}
  };

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
          duration: animationSpeed(maxHeight),
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
            transform: 'scaleY(1)',
          },
          to: {
            maxHeight: '0',
            transform: 'scaleY(0)',
          },
          duration: animationSpeed(maxHeight),
          easing: EASE,
          cleanupStyles: true
        });
      }
    };
  }
}());


