import { EntityState } from '@ngrx/entity';
import { ProjectFolder as PluginProjectFolder } from '@super-productivity/plugin-api';

export type ProjectFolder = Readonly<PluginProjectFolder>;

export type ProjectFolderState = EntityState<ProjectFolder>;
