import {createAction, props} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {<%= classify(name)%>, <%= classify(name)%>State } from '../<%= dasherize(name)%>.model';

export const load<%= classify(name)%>State = createAction(
  '[<%= classify(name)%>] Load <%= classify(name)%> State',
  props<{ state: <%= classify(name)%>State }>(),
);

export const add<%= classify(name)%> = createAction(
  '[<%= classify(name)%>] Add <%= classify(name)%>',
  props<{ <%= camelize(name)%>: <%= classify(name)%> }>(),
);

export const update<%= classify(name)%> = createAction(
  '[<%= classify(name)%>] Update <%= classify(name)%>',
  props<{ <%= camelize(name)%>: Update<<%= classify(name)%>> }>(),
);

export const upsert<%= classify(name)%> = createAction(
  '[<%= classify(name)%>] Upsert <%= classify(name)%>',
  props<{ <%= camelize(name)%>: <%= classify(name)%> }>(),
);

export const delete<%= classify(name)%> = createAction(
  '[<%= classify(name)%>] Delete <%= classify(name)%>',
  props<{ id: string }>(),
);

export const delete<%= classify(name)%>s = createAction(
  '[<%= classify(name)%>] Delete multiple <%= classify(name)%>s',
  props<{ ids: string[] }>(),
);
