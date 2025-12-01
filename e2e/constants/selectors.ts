export const cssSelectors = {
  // Navigation selectors - Updated for correct structure
  SIDENAV: 'magic-side-nav',
  NAV_LIST: 'magic-side-nav .nav-list',
  NAV_ITEM: 'magic-side-nav nav-item',
  NAV_ITEM_BUTTON: 'magic-side-nav nav-item button',
  NAV_GROUP_HEADER: 'magic-side-nav nav-list .g-multi-btn-wrapper nav-item button',
  NAV_GROUP_CHILDREN: 'magic-side-nav nav-list .nav-children',
  NAV_CHILD_ITEM: 'magic-side-nav nav-list .nav-child-item nav-item',
  NAV_CHILD_BUTTON: 'magic-side-nav nav-list .nav-child-item nav-item button',

  // Main navigation items (direct children of .nav-list > li.nav-item)
  MAIN_NAV_ITEMS: 'magic-side-nav .nav-list > li.nav-item nav-item button',

  // Settings and other buttons - improved selector with fallbacks
  SETTINGS_BTN:
    'magic-side-nav .tour-settingsMenuBtn, magic-side-nav nav-item:has([icon="settings"]) button, magic-side-nav button[aria-label*="Settings"]',

  // Legacy selectors for backward compatibility
  OLD_SIDENAV: 'side-nav',
  OLD_NAV_ITEM: 'side-nav-item',
};
