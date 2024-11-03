import { execSync } from 'child_process';
import fs from 'fs';
import inquirer from 'inquirer';
// @ts-ignore
import ora from 'ora';
import path from 'path';
import * as recast from 'recast';

import { groups } from './groups';
import * as appConfigUtils from './src/app-config-manage-utils';
import { addVariable, removeVariable } from './src/env-config-manage-utils';
import { removeVersionFromPackages } from './src/remove-version-from-packages';
import { addModule, removeModule } from './src/root-manage-utils';
import { ModuleDefinition } from './types';

function camelCaseToSentence(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function lintFile(path: string) {
  try {
    execSync(`npx eslint --fix ${path}`);
  } catch {
    // no-op
  }
}

const pathToProject = path.resolve('tsconfig.json');
const projectDir = path.dirname(pathToProject);
const packageManager = 'pnpm';
const pathToAppConfig = path.join(projectDir, 'app.config.ts');
const pathToRoot = path.join(projectDir, 'src', 'root.tsx');
const pathToEnv = path.join(projectDir, 'env.ts');

export async function manageModules(){
  const spinner1 = ora('Searching modules').start();
  const allModules: ModuleDefinition[] = JSON.parse(
    execSync(
      `bun ${__dirname}/src/find-all-modules.ts ${pathToProject}`,
    ).toString(),
  );

  spinner1.stopAndPersist({
    symbol: '✔️',
    text: `${allModules.length} modules found`,
  });

  const spinner2 = ora('Detecting connected modules').start();
  const rootNamedImports: string[] = JSON.parse(
    execSync(
      `bun ${__dirname}/src/find-all-root-imports.ts ${pathToProject}`,
    ).toString(),
  );

  const names = allModules.map((x) => x.name);

  const connectedModules = rootNamedImports
    .filter((x) => names.includes(x))
    .map((x) => allModules.find((y) => y.name === x)!);

  spinner2.stopAndPersist({
    symbol: '✔️',
    text: `${connectedModules.length} modules used`,
  });

  const { selectedModules } = await inquirer.prompt<{
    selectedModules: string[];
  }>([
    {
      type: 'checkbox',
      name: 'selectedModules',
      message: 'Select modules to manage:',
      loop: false,
      choices: [
        ...groups
          .toSorted((x, y) => x.sort - y.sort)
          .flatMap((group) => {
            const items = allModules
              .filter(
                (x) =>
                  x.groups?.includes(group.id) ||
                  (group.id === 'other' && !x.groups),
              )
              .map((x) => ({
                name: camelCaseToSentence(x.name.replace('Module', '')),
                value: x.id,
                description: x.description,
                checked: connectedModules.map((y) => y.id).includes(x.id),
              }));

            if (!items.length) {
              return [];
            }

            return [
              { type: 'separator', separator: `******* ${group.name} *******` },
              ...items,
            ] as any;
          }),
      ],
    },
  ]);

  const uniqueSelectedModules = [...new Set(selectedModules)];

  const modulesToAdd = uniqueSelectedModules
    .filter((x) => !connectedModules.map((y) => y.id).includes(x))
    .map((x) => allModules.find((y) => y.id === x)!);
  const modulesToDelete = connectedModules.filter(
    (x) => !uniqueSelectedModules.includes(x.id),
  );

  const removedDependencies = modulesToDelete.flatMap((x) => x.dependencies);
  if (removedDependencies.length > 0) {
    const spinner = ora('Removing dependencies').start();
    try {
      const command = `${packageManager} remove ${removeVersionFromPackages(
        removedDependencies.join(' '),
      )} --force --silent`;
      execSync(command);
    } catch {
      // no-op
    }
    spinner.stopAndPersist({
      symbol: '✔️',
      text: `Dependencies removed`,
    });
  }

  const newDependencies = modulesToAdd.flatMap((x) => x.dependencies);
  if (newDependencies.length > 0) {
    const spinner = ora('Adding dependencies').start();
    try {
      const command = `pnpm i ${newDependencies.join(' ')} --force --silent`;

      execSync(command);
    } catch {
      // no-op
    }
    spinner.stopAndPersist({
      symbol: '✔️',
      text: `Dependencies added`,
    });
  }

  const rootAst = recast.parse(fs.readFileSync(pathToRoot, 'utf-8'), {
    parser: require('recast/parsers/typescript'),
  });
  const spinner4 = ora('Modifying root.tsx').start();

  for (const module of modulesToDelete) {
    removeModule(rootAst, module.name);
  }

  for (const module of modulesToAdd) {
    addModule(rootAst, module.name, module.import);
  }

  // Write the modified code back to the file
  fs.writeFileSync(pathToRoot, recast.print(rootAst).code);
  lintFile(pathToRoot);

  spinner4.stopAndPersist({
    symbol: '✔️',
    text: `root.tsx updated`,
  });

  const spinner5 = ora('Modifying env.ts').start();
  const newConnectedModules = [
    ...modulesToAdd,
    ...connectedModules.filter((x) => !modulesToDelete.includes(x)),
  ];
  const allVariables = newConnectedModules.flatMap((x) => x.variables);

  const envConfigAst = recast.parse(fs.readFileSync(pathToEnv, 'utf-8'), {
    parser: require('recast/parsers/typescript'),
  });

  for (const variable of modulesToDelete.flatMap((x) => x.variables)) {
    removeVariable(envConfigAst, variable);
  }

  for (const variable of allVariables) {
    addVariable(envConfigAst, variable);
  }

  fs.writeFileSync(pathToEnv, recast.print(envConfigAst).code);
  lintFile(pathToEnv);

  try {
    execSync(`npx load-env --ignore-error`);
  } catch {
    // no-op
  }

  spinner5.stopAndPersist({
    symbol: '✔️',
    text: `env.ts updated`,
  });

  const spinner6 = ora('Modifying app.config.ts').start();

  const appConfigAst = recast.parse(fs.readFileSync(pathToAppConfig, 'utf-8'), {
    parser: require('recast/parsers/typescript'),
  });

  for (const plugin of modulesToDelete.flatMap((x) => x.plugin)) {
    if (typeof plugin === 'string') {
      appConfigUtils.removePlugin(appConfigAst, plugin);
    } else {
      appConfigUtils.removePlugin(appConfigAst, plugin[0]);
    }
  }

  for (const plugin of newConnectedModules.flatMap((x) => x.plugin)) {
    if (typeof plugin === 'string') {
      appConfigUtils.addPlugin(appConfigAst, plugin);
    } else {
      appConfigUtils.addPlugin(appConfigAst, plugin[0], plugin[1]);
    }
  }

  appConfigUtils.replaceEnvVariables(appConfigAst);

  fs.writeFileSync(pathToAppConfig, recast.print(appConfigAst).code);
  lintFile(pathToAppConfig);

  spinner6.stopAndPersist({
    symbol: '✔️',
    text: `app.config.ts updated`,
  });

  process.exit(0);
}

