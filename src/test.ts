// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ElectronAPI } from '../electron/electronAPI';

declare global {
  interface Window {
    ea: ElectronAPI;
  }
}

// Mock browser dialogs globally for tests
// We need to handle tests that try to spy on alert/confirm after we've already mocked them
// First check if alert/confirm are already spies (from previous test runs)
if (!(window.alert as any).and) {
  window.alert = jasmine.createSpy('alert');
}
if (!(window.confirm as any).and) {
  window.confirm = jasmine.createSpy('confirm').and.returnValue(true);
}

// Configure the TestBed providers globally
const originalConfigureTestingModule = TestBed.configureTestingModule;
TestBed.configureTestingModule = function (moduleDef: any) {
  if (!moduleDef.providers) {
    moduleDef.providers = [];
  }

  // Add zoneless change detection provider if not already present
  const hasZonelessProvider = moduleDef.providers.some(
    (p: any) =>
      p === provideExperimentalZonelessChangeDetection ||
      (p && p.provide === provideExperimentalZonelessChangeDetection),
  );

  if (!hasZonelessProvider) {
    moduleDef.providers.push(provideExperimentalZonelessChangeDetection());
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
