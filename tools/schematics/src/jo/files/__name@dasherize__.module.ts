import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {<%= classify(name)%>Effects} from './store/<%= dasherize(name)%>.effects';
import {<%= underscore(name).toUpperCase() %>_FEATURE_NAME, <%= camelize(name)%>Reducer} from './store/<%= dasherize(name)%>.reducer';

@NgModule({
    imports: [
        CommonModule,
        StoreModule.forFeature(<%= underscore(name).toUpperCase() %>_FEATURE_NAME, <%= camelize(name)%>Reducer),
        EffectsModule.forFeature([<%= classify(name)%>Effects])
    ],
    declarations: [],
    entryComponents: [],
    exports: [],
})
export class <%= classify(name)%>Module {
}
