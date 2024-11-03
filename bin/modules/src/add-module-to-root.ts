import { execSync } from 'child_process';
import fs from 'fs';

export function addModuleAndImport(
  pathToRoot: string,
  moduleName: string,
  modulePath: string
) {
  let code = fs.readFileSync(pathToRoot, 'utf8');

  // 1. Add the import statement if it doesn't exist
  const importRegex = new RegExp(
    `import\\s+{?\\s*${moduleName}\\s*}?\\s+from\\s+['"\`]${modulePath}['"\`];?`
  );
  if (!importRegex.test(code)) {
    code = `import { ${moduleName} } from '${modulePath}';\n${code}`;
  }

  // 2. Find the end of the modules array and insert the new module
  const modulesRegex = /modules:\s*\[(.*?)\](,?)(\s*\})/s;
  const newModuleEntry = `new ${moduleName}()`;

  code = code.replace(modulesRegex, (match, modules, comma, endBrace) => {
    const updatedModules = `${modules.trim() ? modules.trim() : ''}\n    ${newModuleEntry}`;
    return `modules: [${updatedModules}]${comma}${endBrace}`;
  });

  fs.writeFileSync(pathToRoot, code, 'utf8');

  try {
    execSync(`npx eslint --fix ${pathToRoot}`);
  } catch {
    // no-op
  }
}
