import * as recast from 'recast';

export function addPlugin(
  ast: any,
  pluginName: string,
  pluginOptions?: Record<string, unknown> | null
) {
  recast.visit(ast, {
    visitObjectProperty(path) {
      const { node } = path;

      if (
        node.key.type === 'Identifier' &&
        node.key.name === 'plugins' &&
        node.value.type === 'ArrayExpression'
      ) {
        const exists = node.value.elements.some((element) => {
          if (!element) {
            return false;
          }

          if (element.type === 'StringLiteral') {
            return element.value === pluginName;
          }

          if (element.type === 'ArrayExpression') {
            const firstElement = element.elements[0];

            return (
              firstElement?.type === 'StringLiteral' &&
              firstElement.value === pluginName
            );
          }

          return false;
        });

        if (exists) {
          return false;
        }

        const hasOptions =
          pluginOptions && Object.keys(pluginOptions).length > 0;

        node.value.elements.push(
          !hasOptions
            ? recast.parse(`"${pluginName}"`)
            : recast.parse(
                `["${pluginName}", ${JSON.stringify(pluginOptions)}]`
              )
        );
      }

      this.traverse(path);
    },
  });
}

export function removePlugin(ast: any, pluginName: string) {
  recast.visit(ast, {
    visitObjectProperty(path) {
      const { node } = path;

      if (
        node.key.type === 'Identifier' &&
        node.key.name === 'plugins' &&
        node.value.type === 'ArrayExpression'
      ) {
        node.value.elements = node.value.elements.filter((element) => {
          if (element?.type === 'StringLiteral') {
            return element.value !== pluginName;
          }

          if (element?.type === 'ArrayExpression') {
            const firstElement = element.elements[0];

            return !(
              firstElement?.type === 'StringLiteral' &&
              firstElement.value === pluginName
            );
          }

          return true;
        });
      }

      this.traverse(path);
    },
  });
}

export function replaceEnvVariables(ast: any) {
  recast.visit(ast, {
    visitLiteral(path) {
      if (
        typeof path.node.value === 'string' &&
        path.node.value.startsWith('[env_') &&
        path.node.value.endsWith(']')
      ) {
        path.replace(
          recast.parse(
            `Env.${path.node.value.replace('[env_', '').replace(']', '')}`
          )
        );
      }

      this.traverse(path);
    },
  });
}
