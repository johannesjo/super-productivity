import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity';
import { <%= classify(name)%>Actions, <%= classify(name)%>ActionTypes } from './<%= dasherize(name) %>.actions';
import { <%= classify(name)%>, <%= classify(name)%>State } from '../<%= dasherize(name) %>.model';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const <%= underscore(name).toUpperCase()%>_FEATURE_NAME = '<%= camelize(name) %>';


export const adapter: EntityAdapter<<%= classify(name)%>> = createEntityAdapter<<%= classify(name)%>>();
export const select<%= classify(name)%>FeatureState = createFeatureSelector<<%= classify(name)%>State>(<%= underscore(name).toUpperCase()%>_FEATURE_NAME);
export const {selectIds, selectEntities, selectAll, selectTotal} = adapter.getSelectors();
export const selectAll<%= classify(name)%>s = createSelector(select<%= classify(name)%>FeatureState, selectAll);
export const selectIsShow<%= classify(name)%>Bar = createSelector(select<%= classify(name)%>FeatureState, state => state.isShow<%= classify(name)%>s);

export const initial<%= classify(name)%>State: <%= classify(name)%>State = adapter.getInitialState({
    // additional entity state properties
});

export function <%= camelize(name) %>Reducer(
    state = initial<%= classify(name)%>State,
    action: <%= classify(name)%>Actions
): <%= classify(name)%>State {
    switch (action.type) {
        case <%= classify(name)%>ActionTypes.Add<%= classify(name)%>: {
            return adapter.addOne(action.payload.<%= camelize(name) %>, state);
        }

        case <%= classify(name)%>ActionTypes.Update<%= classify(name)%>: {
            return adapter.updateOne(action.payload.<%= camelize(name) %>, state);
        }

        case <%= classify(name)%>ActionTypes.Delete<%= classify(name)%>: {
            return adapter.removeOne(action.payload.id, state);
        }

        case <%= classify(name)%>ActionTypes.Load<%= classify(name)%>State:
            return {...action.payload.state};

        default: {
            return state;
        }
    }
}


