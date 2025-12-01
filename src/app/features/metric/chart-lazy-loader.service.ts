import { Injectable } from '@angular/core';

type ChartJSModule = typeof import('chart.js');

@Injectable({
  providedIn: 'root',
})
export class ChartLazyLoaderService {
  private chartJSModule?: ChartJSModule;
  private loadingPromise?: Promise<void>;
  private isRegistered = false;

  async loadChartModule(): Promise<void> {
    // If already loading, return the existing promise
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // If already loaded, return immediately
    if (this.chartJSModule && this.isRegistered) {
      return Promise.resolve();
    }

    // Start loading and cache the promise
    this.loadingPromise = this._loadModules();
    return this.loadingPromise;
  }

  private async _loadModules(): Promise<void> {
    const chartJs = await import('chart.js');

    // Register Chart.js components only once
    if (!this.isRegistered) {
      const { Chart, registerables } = chartJs;
      Chart.register(...registerables);
      this.isRegistered = true;
    }

    // Cache the module
    this.chartJSModule = chartJs;
  }

  getChartModule(): ChartJSModule | undefined {
    return this.chartJSModule;
  }
}
