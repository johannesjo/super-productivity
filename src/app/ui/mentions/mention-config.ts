// configuration structure, backwards compatible with earlier versions

import { MentionItem } from './mention-types';

export { MentionItem } from './mention-types';

export interface MentionConfig<T = MentionItem> extends Mentions<T> {
  // nested config
  mentions?: Mentions<T>[];

  // option to disable encapsulated styles so global styles can be used instead
  disableStyle?: boolean;
}

export interface Mentions<T = MentionItem> {
  // an array of strings or objects to suggest - can be any array for flexibility
  items?: T[] | string[];

  // the character that will trigger the menu behavior
  triggerChar?: string;

  // option to specify the field in the objects to be used as the item label
  labelKey?: string;

  // option to limit the number of items shown in the pop-up menu
  maxItems?: number;

  // option to disable sorting
  disableSort?: boolean;

  // option to disable internal filtering. can be used to show the full list returned
  // from an async operation
  disableSearch?: boolean;

  // display menu above text instead of below
  dropUp?: boolean;

  // whether to allow space while mentioning or not
  allowSpace?: boolean;

  // option to include the trigger char in the searchTerm event
  returnTrigger?: boolean;

  // optional function to format the selected item before inserting the text
  mentionSelect?: (item: T | string, triggerChar?: string) => string;

  // optional function to customize the search implementation
  mentionFilter?: (searchString: string, items?: T[] | string[]) => T[] | string[];
}
