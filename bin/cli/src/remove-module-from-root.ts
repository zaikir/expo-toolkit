import { execSync } from 'child_process';
import fs from 'fs';

export function removeModuleFromRoot(pathToRoot: string, moduleName: string) {
  let content = fs.readFileSync(pathToRoot, 'utf8');

  // Replace the matches with an empty string
  content = content
    .replace(new RegExp(`import *{ *${moduleName} *} *from +.*`, 'g'), '')
    .replace(new RegExp(`new +${moduleName}\(.*\)`, 'g'), '');

  fs.writeFileSync(pathToRoot, content, 'utf8');

  try {
    execSync(`npx eslint --fix ${pathToRoot}`);
  } catch {
    // no-op
  }
}
