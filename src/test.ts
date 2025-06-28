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
