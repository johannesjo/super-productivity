import { Dictionary } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/is-migrate-model';
import { Tag, TagCopy, TagState } from './tag.model';
import { TODAY_TAG } from './tag.const';
import { MODEL_VERSION } from '../../core/model-version';

export const migrateTagState = (tagState: TagState): TagState => {
  if (!isMigrateModel(tagState, MODEL_VERSION.TAG, 'Tag')) {
    return tagState;
  }

  const tagEntities: Dictionary<Tag> = { ...tagState.entities };
  Object.keys(tagEntities).forEach((key) => {
    if (key === TODAY_TAG.id) {
      tagEntities[key] = _addBackgroundImageForDarkTheme(tagEntities[key] as TagCopy);
    }
    // tagEntities[key] = _addNewIssueFields(tagEntities[key] as TagCopy);
  });

  return { ...tagState, entities: tagEntities, [MODEL_VERSION_KEY]: MODEL_VERSION.TAG };
};

const _addBackgroundImageForDarkTheme = (tag: Tag): Tag => {
  if (tag.theme.hasOwnProperty('backgroundImageDark')) {
    return tag;
  } else {
    return {
      ...tag,
      theme: {
        ...tag.theme,
        backgroundImageDark: TODAY_TAG.theme.backgroundImageDark,
      },
    };
  }
};
