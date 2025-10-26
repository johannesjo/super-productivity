export interface OpenProjectFilterItem {
  [key: string]: OpenProjectFilterValues;
}

export interface OpenProjectFilterValues {
  operator:
    | '='
    | '&='
    | '!'
    | '>='
    | '<='
    | 't-'
    | 't+'
    | '<t+'
    | '>t+'
    | '>t-'
    | '<t-'
    | '*'
    | '!*'
    | '**'
    | '=d'
    | '<>d'
    | 'w'
    | 't'
    | '~'
    | '!~'
    | 'o'
    | 'c'
    | 'ow';
  values: string[] | number[];
}
