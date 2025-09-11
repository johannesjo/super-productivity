import { ProjectFolderState } from '../project-folder.model';
import { adapter } from './project-folder.reducer';

export const initialProjectFolderState: ProjectFolderState = adapter.getInitialState({});
