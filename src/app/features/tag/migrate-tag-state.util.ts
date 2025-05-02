import { Dictionary } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/is-migrate-model';
import { Tag, TagState } from './tag.model';
import { MODEL_VERSION } from '../../core/model-version';

export const migrateTagState = (tagState: TagState): TagState => {
  if (!isMigrateModel(tagState, MODEL_VERSION.TAG, 'Tag')) {
    return tagState;
  }

  const tagEntities: Dictionary<Tag> = { ...tagState.entities };

  return { ...tagState, entities: tagEntities, [MODEL_VERSION_KEY]: MODEL_VERSION.TAG };
};
