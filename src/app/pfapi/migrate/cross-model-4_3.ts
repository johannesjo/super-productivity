import { AppDataCompleteNew } from '../pfapi-config';
import { CrossModelMigrateFn } from '../api';
import { PFLog } from '../../core/log';
import { menuTreeInitialState } from '../../features/menu-tree/store/menu-tree.reducer';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const crossModelMigration4_3: CrossModelMigrateFn = ((
  fullData: AppDataCompleteNew,
): AppDataCompleteNew => {
  PFLog.log('____________________Migrate4.3__________________');
  const copy = fullData;

  // Ensure menuTree exists for backward compatibility with older data files
  if (!copy.menuTree || typeof copy.menuTree !== 'object') {
    copy.menuTree = menuTreeInitialState;
    PFLog.log('Added missing menuTree with initial state');
  } else {
    // Ensure required properties exist even if menuTree is present
    if (!Array.isArray(copy.menuTree.projectTree)) {
      copy.menuTree.projectTree = [];
    }
    if (!Array.isArray(copy.menuTree.tagTree)) {
      copy.menuTree.tagTree = [];
    }
  }

  PFLog.log('Ensured menuTree exists and has proper structure', copy.menuTree);
  return copy;
}) as CrossModelMigrateFn;
