import {apply, mergeWith, Rule, SchematicContext, template, Tree, url} from '@angular-devkit/schematics';
import {strings} from '@angular-devkit/core';
import {strings} from 'underscore.string';

// const TPL = './tpl/';

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export function jo(_options: any, _context: SchematicContext): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        console.log(tree, _context);

        const sourceTemplates = url('./files');
        const sourceParameterizedTemplates = apply(sourceTemplates, [
            template({
                ..._options,
                ...strings
            })
        ]);
        return mergeWith(sourceParameterizedTemplates);
    };
}
