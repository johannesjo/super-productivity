import { EntityState } from '@ngrx/entity';
// import { Label, SingleDataSet } from 'ng2-charts';
import { ChartData } from 'chart.js';
import { MODEL_VERSION_KEY } from '../../app.constants';

export interface MetricCopy {
  // string date of day
  id: string;

  // used as id
  obstructions: string[];
  improvements: string[];
  improvementsTomorrow: string[];
  mood?: number | null;
  productivity?: number | null;
}

export type Metric = Readonly<MetricCopy>;

export interface MetricState extends EntityState<Metric> {
  [MODEL_VERSION_KEY]?: number;
}

export type PieChartData = ChartData<'pie', number[], string>;
export type LineChartData = ChartData<'line', (number | undefined)[], string>;

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
