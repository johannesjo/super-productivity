(function() {

  'use strict';

  angular.module('mdxUtil', ['ngMaterial'])
    .directive('mdxPaintFg', function(mdx) {
      return {
        restrict: 'A',
        link: function(scope, element, attributes) {
          setRGB(element, 'color', mdx, attributes.mdxPaintFg, 'mdx-paint-fg');
        }
      };
    })
    .directive('mdxPaintBg', function(mdx) {
      return {
        restrict: 'A',
        link: function(scope, element, attributes) {
          setRGB(element, 'background-color', mdx, attributes.mdxPaintBg, 'mdx-paint-bg');
        }
      };
    })
    .directive('mdxPaintBorder', function(mdx) {
      return {
        restrict: 'A',
        link: function(scope, element, attributes) {
          setRGB(element, 'border-color', mdx, attributes.mdxPaintBorder, 'mdx-paint-border');
        }
      };
    })
    .directive('mdxPaintSvg', function(mdx) {
      return {
        restrict: 'A',
        link: function(scope, element, attributes) {
          setRGB(element, 'fill', mdx, attributes.mdxPaintSvg, 'mdx-paint-svg');
        }
      };
    })
    // Couldn't get access to _PALETTES any other way?
    .provider('mdx', function($mdThemingProvider) {
      return {
        $get: function($rootScope) {
          return {
            mdxThemeColors: $mdThemingProvider,
            $rootScope: $rootScope
          };
        }
      };
    });

  function setRGB(element, styled, mdx, input, directiveName) {
    const themeProvider = mdx.mdxThemeColors;
    var themeName = mdx.$rootScope.r.theme;
    var hueName = 'default';
    var intentionName = 'primary';
    var hueKey, theme, hue, intention;

    // Do our best to parse out the attributes
    angular.forEach(input.split(' '), function(value, key) {
      if (0 === key && 'default' === value) {
        themeName = value;
      } else if ({
          primary: 'primary',
          accent: 'accent',
          warn: 'warn',
          background: 'background'
        }[value]) {
        intentionName = value;
      } else if ({
          default: 'default',
          'hue-1': 'hue-1',
          'hue-2': 'hue-2',
          'hue-3': 'hue-3'
        }[value]) {
        hueName = value;
      } else if ({
          '50': '50', '100': '100', '200': '200', '300': '300', '400': '400',
          '500': '500', '600': '600', '700': '700', '800': '800', 'A100': 'A100',
          'A200': 'A200', 'A400': 'A400', 'A700': 'A700'
        }[value]) {
        hueKey = value;
      }
    });

    // Lookup and assign the right values
    if ((theme = themeProvider._THEMES[themeName])) {
      if ((intention = theme.colors[intentionName])) {
        if (!hueKey) {
          hueKey = intention.hues[hueName];
        }
        if ((hue = themeProvider._PALETTES[intention.name][hueKey])) {
          element.css(styled, 'rgb(' + hue.value[0] + ',' + hue.value[1] + ',' + hue.value[2] + ')');
          return;
        }
      }
    }
    reportError(`%s='%s' bad or missing attributes`, directiveName, input);
  }

  function reportError(errString, name, input) {
    console.error(errString, name, input);
    console.log('  usage %s="[theme] intention [hue]"', name);
    console.log('    acceptable intentions : primary,accent,warn,background');
    console.log('    acceptable hues       : default,hue-1,hue-2,hue-3');
  }
}());