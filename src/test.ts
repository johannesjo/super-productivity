// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { provideZonelessChangeDetection } from '@angular/core';
// Type definitions for window.ea are in ./app/core/window-ea.d.ts

beforeAll(() => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 2000;
});

// Mock browser dialogs globally for tests
// We need to handle tests that try to spy on alert/confirm after we've already mocked them
// First check if alert/confirm are already spies (from previous test runs)
if (!(window.alert as jasmine.Spy).and) {
  window.alert = jasmine.createSpy('alert');
}
if (!(window.confirm as jasmine.Spy).and) {
  window.confirm = jasmine.createSpy('confirm').and.returnValue(true);
}

// Configure the TestBed providers globally
const originalConfigureTestingModule = TestBed.configureTestingModule;
TestBed.configureTestingModule = function (
  moduleDef: Parameters<typeof originalConfigureTestingModule>[0],
) {
  if (!moduleDef.providers) {
    moduleDef.providers = [];
  }

  // Add zoneless change detection provider if not already present
  const hasZonelessProvider = moduleDef.providers.some(
    (p: unknown) =>
      p === provideZonelessChangeDetection ||
      (p &&
        typeof p === 'object' &&
        'provide' in p &&
        p.provide === provideZonelessChangeDetection),
  );

  if (!hasZonelessProvider) {
    moduleDef.providers.push(provideZonelessChangeDetection());
  }

  return originalConfigureTestingModule.call(this, moduleDef);
};

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  {
    teardown: { destroyAfterEach: false },
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
);
