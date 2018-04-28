(function() {
  'use strict';

  angular
    .module('superProductivity')
    .animation('.ani-slide-up-down', slideAnimation);

  const DUR = 0.15;
  const EASE = 'cubic-bezier(.38, .04, .35, .96)';

  const animationSpeed = (height) => {
    if (height >= 450) {
      return DUR * 1.25;
    } else if (height > 200 && height < 450) {
      return DUR;
    } else {
      return DUR;
    }
  };

  /* @ngInject */
  function slideAnimation($animateCss) {

    function show($el) {
      const el = $el[0];
      //const sh = el.scrollHeight;
      const height = el.offsetHeight;
      return $animateCss($el, {
        from: {
          height: '0',
          transform: 'scaleY(0)',
        },
        to: {
          height: height + 'px',
          transform: 'scaleY(1)',
        },
        duration: animationSpeed(height),
        easing: EASE,
        cleanupStyles: true
      });
    }

    function hide($el) {
      const el = $el[0];
      //const sh = el.scrollHeight;
      const height = el.offsetHeight;
      return $animateCss($el, {
        from: {
          height: height + 'px',
          transform: 'scaleY(1)'
        },
        to: {
          height: '0',
          transform: 'scaleY(0)'
        },
        duration: animationSpeed(height),
        easing: EASE,
        cleanupStyles: true
      });
    }

    return {
      enter: show,
      leave: hide,

      // todo maybe check if it was the right class
      addClass: hide,
      removeClass: show,
    };
  }
}());


