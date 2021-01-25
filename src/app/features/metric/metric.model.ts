import { EntityState } from '@ngrx/entity';
import { Label, SingleDataSet } from 'ng2-charts';
import { ChartDataSets } from 'chart.js';

export interface MetricCopy {
  // string date of day
  id: string;

  // used as id
  obstructions: string[];
  improvements: string[];
  improvementsTomorrow: string[];
  mood?: number;
  productivity?: number;
}

export type Metric = Readonly<MetricCopy>;

export type MetricState = EntityState<Metric>;

export interface PieChartData {
  labels: Label[];
  data: SingleDataSet;
}

export interface LineChartData {
  labels: Label[];
  data: ChartDataSets[];
}

export interface SimpleMetrics {
  start: string;
  end: string;
  timeSpent: number;
  timeEstimate: number;
  breakTime: number;
  breakNr: number;
  nrOfCompletedTasks: number;
  nrOfAllTasks: number;
  nrOfSubTasks: number;
  nrOfMainTasks: number;
  nrOfParentTasks: number;
  daysWorked: number;
  avgTasksPerDay: number;
  avgTimeSpentOnDay: number;
  avgTimeSpentOnTask: number;
  avgTimeSpentOnTaskIncludingSubTasks: number;
  avgBreakNr: number;
  avgBreakTime: number;
}
