import { Project } from 'ts-morph';

import { ModuleDefinition } from '../types';

export function findAllModules(
  pathToProject: string,
  moduleInterface = 'ToolkitModule'
) {
  const project = new Project({
    tsConfigFilePath: pathToProject,
  });
  project.addSourceFilesAtPaths('node_modules/**/*.d.ts');

  return [...project.getSourceFiles()].flatMap((sourceFile) =>
    sourceFile
      .getClasses()
      .filter((x) =>
        x.getImplements().find((y) => y.getText() === moduleInterface)
      )
      .map((x) => {
        const name = x.getName();
        const pluginsType = x.getGetAccessor('plugin')?.getType();

        return {
          id: JSON.parse(x.getMemberOrThrow('name').getType().getText()),
          name,
          description: x.getMember('description')
            ? JSON.parse(x.getMemberOrThrow('description').getType().getText())
            : null,
          groups: x.getMember('groups')
            ? JSON.parse(
                x
                  .getMemberOrThrow('groups')
                  .getType()
                  .getText()
                  .replace('readonly', '')
                  .trim()
              )
            : null,
          ...(() => {
            const importString = pluginsType
              ?.getProperty('import')
              ?.getValueDeclaration()
              ?.getType()
              ?.getText()
              ?.replace('readonly', '')
              .trim();

            return {
              import: importString
                ? JSON.parse(importString)
                : sourceFile.getFilePath().replace(/\\/g, '/'),
            };
          })(),
          ...(() => {
            const dependenciesString = pluginsType
              ?.getProperty('dependencies')
              ?.getValueDeclaration()
              ?.getType()
              ?.getText()
              ?.replace('readonly', '')
              .trim();

            return {
              dependencies: dependenciesString
                ? JSON.parse(dependenciesString)
                : [],
            };
          })(),
          ...(() => {
            const variables = pluginsType
              ?.getProperty('variables')
              ?.getValueDeclaration()
              ?.getType()
              ?.getProperties()
              .map((env) => {
                const name = env.getName();
                const valueDeclaration = env.getValueDeclaration()?.getType();
                const defaultValueType = valueDeclaration
                  ?.getProperty('default')
                  ?.getValueDeclaration()
                  ?.getType();

                return {
                  name,
                  required:
                    valueDeclaration
                      ?.getProperty('required')
                      ?.getValueDeclaration()
                      ?.getType()
                      .getText() === 'true',
                  type: JSON.parse(
                    valueDeclaration
                      ?.getProperty('type')
                      ?.getValueDeclaration()
                      ?.getType()
                      .getText() ?? '"string"'
                  ),
                  default: defaultValueType
                    ? JSON.parse(defaultValueType.getText())
                    : undefined,
                };
              });

            return {
              variables: variables ?? [],
            };
          })(),
          ...(() => {
            const elements = pluginsType
              ?.getProperty('plugin')
              ?.getValueDeclaration()
              ?.getType()
              ?.getTupleElements();

            return {
              plugin:
                elements?.map((elem) => {
                  const innerElements = elem.getTupleElements();
                  if (innerElements.length === 0) {
                    return JSON.parse(elem.getText());
                  }

                  const [nameElem, paramsElem] = elem.getTupleElements();
                  return [
                    JSON.parse(nameElem.getText()),
                    Object.fromEntries(
                      paramsElem?.getProperties().map((env) => {
                        const name = env.getName();
                        const valueDeclaration = env
                          .getValueDeclaration()
                          ?.getType();

                        return [
                          name,
                          JSON.parse(valueDeclaration?.getText() ?? 'null'),
                        ];
                      })
                    ),
                  ];
                }) ?? [],
            };
          })(),
        } as ModuleDefinition;
      })
  );
}

// Run function if file is executed directly from CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const pathToProject = args[0];
  const moduleInterface = args[1] || 'ToolkitModule';

  if (!pathToProject) {
    console.error(
      'Usage: bun find-all-modules.ts <pathToProject> [moduleInterface]'
    );
    process.exit(1);
  }

  const result = findAllModules(pathToProject, moduleInterface);
  console.log(JSON.stringify(result));
}
