import { Dictionary } from '@ngrx/entity';
import { MODEL_VERSION_KEY } from '../../app.constants';
import { isMigrateModel } from '../../util/model-version';
import { Tag, TagCopy, TagState } from './tag.model';
import {
  IMPORTANT_TAG,
  NOT_IMPORTANT_TAG,
  NOT_URGENT_TAG,
  TODAY_TAG,
  URGENT_TAG,
} from './tag.const';
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

  return _addDefaultTagsIfNecessary({
    ...tagState,
    entities: tagEntities,
    [MODEL_VERSION_KEY]: MODEL_VERSION.TAG,
  });
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

const _addDefaultTagsIfNecessary = (tagState: TagState): TagState => {
  if (tagState.entities[URGENT_TAG.id]) {
    return tagState;
  } else {
    const tagToAdd: Tag[] = [
      IMPORTANT_TAG,
      URGENT_TAG,
      NOT_IMPORTANT_TAG,
      NOT_URGENT_TAG,
    ].filter((tag) => !tagState.entities[tag.id]);

    return tagToAdd.reduce<TagState>((acc, tag) => {
      return {
        ...acc,
        entities: {
          ...acc.entities,
          [tag.id]: tag,
        },
        ids: [...acc.ids, tag.id] as string[],
      };
    }, tagState);
  }
};
