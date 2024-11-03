import * as recast from 'recast';

export function removeModule(ast: any, moduleName: string) {
  recast.types.visit(ast, {
    visitImportDeclaration(path) {
      if (
        typeof path.node.source.value === 'string' &&
        path.node.source.value.includes(moduleName)
      ) {
        path.prune();
      }
      this.traverse(path);
    },
    visitNewExpression(path) {
      // @ts-ignore
      if (path.node.callee.name === moduleName) {
        path.prune();
      }
      this.traverse(path);
    },
  });
}

// Helper function to check if import exists
function hasImport(ast: any, moduleName: string) {
  let found = false;
  recast.types.visit(ast, {
    visitImportDeclaration(path) {
      if (
        path.node.specifiers?.some((spec) => spec.local?.name === moduleName)
      ) {
        found = true;
        return false;
      }
      this.traverse(path);
    },
  });
  return found;
}

// Helper function to add an import if it doesn't exist
function addImport(ast: any, moduleName: string, modulePath: string) {
  if (!hasImport(ast, moduleName)) {
    const importStatement = recast.parse(
      `import { ${moduleName} } from '${modulePath}';`
    );
    ast.program.body.unshift(importStatement.program.body[0]);
  }
}

// Helper function to add a module instance to the array
export function addModule(ast: any, moduleName: string, modulePath: string) {
  addImport(ast, moduleName, modulePath); // Add import if missing

  recast.types.visit(ast, {
    visitArrayExpression(path) {
      if (
        path.parentPath.node.key &&
        path.parentPath.node.key.name === 'modules'
      ) {
        const newModuleInstance = recast.parse(`new ${moduleName}()`);

        path.node.elements.push(newModuleInstance.program.body[0].expression);
        return false;
      }
      this.traverse(path);
    },
  });
}
