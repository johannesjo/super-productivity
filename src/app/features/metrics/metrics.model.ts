export interface ImprovementCopy {
  id: string;
  text: string;
}
export interface ObstructionCopy {
  id: string;
  text: string;
}
export interface ImprovementForTomorrowCopy {
  id: string;
  text: string;
}

export interface MetricsForDay {
  // used as id
  date: string;
  obstructions: string[];
  improvements: string[];
  improvementsTomorrow: string[];
  mood?: number;
  efficiency?: number;
}


// TODO create real
export interface MetricsState {
  entities: MetricsForDay[];
  allImprovements: ImprovementCopy[];
}
