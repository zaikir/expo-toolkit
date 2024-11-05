import * as recast from 'recast';

import { ModuleDefinition } from '../types';

export function addVariable(
  ast: any,
  variable: ModuleDefinition['variables'][number]
) {
  recast.visit(ast, {
    visitExportDefaultDeclaration(path) {
      const { node } = path;
      if (node.declaration.type === 'ObjectExpression') {
        const exists = node.declaration.properties.some(
          (x) =>
            x.type === 'ObjectProperty' &&
            x.key.type === 'Identifier' &&
            x.key.name === variable.name
        );

        if (exists) {
          return false;
        }

        node.declaration.properties.push(
          recast.parse(
            `${variable.name}: ${variable.schema ?? `z.${variable.type === 'string' ? 'string' : `.string().transform((x) => x === 'true')`}()${variable.required ? '' : '.optional()'}${variable.default === undefined ? '' : `.default(${JSON.stringify(variable.type === 'string' ? variable.default : `${variable.default}`)})`}`}`
          )
        );
      }

      this.traverse(path);
    },
  });
}

export function removeVariable(
  ast: any,
  variable: ModuleDefinition['variables'][number]
) {
  recast.visit(ast, {
    visitExportDefaultDeclaration(path) {
      const { node } = path;
      if (node.declaration.type === 'ObjectExpression') {
        node.declaration.properties = node.declaration.properties.filter(
          (x) =>
            x.type === 'ObjectProperty' &&
            x.key.type === 'Identifier' &&
            x.key.name !== variable.name
        );
      }

      this.traverse(path);
    },
  });
}
