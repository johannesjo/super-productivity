import {Action} from '@ngrx/store';
import {Update} from '@ngrx/entity';
import {<%= classify(name)%>, <%= classify(name)%>State} from '../<%= dasherize(name)%>.model';

export enum <%= classify(name)%>ActionTypes {
    Load<%= classify(name)%>State = '[<%= classify(name)%>] Load <%= classify(name)%> State',
    Add<%= classify(name)%> = '[<%= classify(name)%>] Add <%= classify(name)%>',
    Update<%= classify(name)%> = '[<%= classify(name)%>] Update <%= classify(name)%>',
    Upsert<%= classify(name)%> = '[<%= classify(name)%>] Upsert <%= classify(name)%>',
    Delete<%= classify(name)%> = '[<%= classify(name)%>] Delete <%= classify(name)%>',
}

export class Load<%= classify(name)%>State implements Action {
    readonly type = <%= classify(name)%>ActionTypes.Load<%= classify(name)%>State;

    constructor(public payload: { state: <%= classify(name)%>State }) {
    }
}

export class Add<%= classify(name)%> implements Action {
    readonly type = <%= classify(name)%>ActionTypes.Add<%= classify(name)%>;

    constructor(public payload: { <%= camelize(name)%>: <%= classify(name)%> }) {
    }
}

export class Update<%= classify(name)%> implements Action {
    readonly type = <%= classify(name)%>ActionTypes.Update<%= classify(name)%>;

    constructor(public payload: { <%= camelize(name)%>: Update<<%= classify(name)%>> }) {
    }
}

export class Upsert<%= classify(name)%> implements Action {
  readonly type = <%= classify(name)%>ActionTypes.Upsert<%= classify(name)%>;

  constructor(public payload: {  <%= camelize(name)%>: <%= classify(name)%> }) {
  }
}

export class Delete<%= classify(name)%> implements Action {
    readonly type = <%= classify(name)%>ActionTypes.Delete<%= classify(name)%>;

    constructor(public payload: { id: string }) {
    }
}


export type <%= classify(name)%>Actions =
    Load<%= classify(name)%>State
    | Add<%= classify(name)%>
    | Update<%= classify(name)%>
    | Upsert<%= classify(name)%>
    | Delete<%= classify(name)%>
    ;
