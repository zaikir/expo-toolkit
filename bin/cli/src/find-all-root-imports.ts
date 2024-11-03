import { Project } from 'ts-morph';

export function findAllRootImports(pathToProject: string) {
  const project = new Project({
    tsConfigFilePath: pathToProject,
  });

  const content = project.getSourceFile('root.tsx');
  if (!content) {
    throw new Error('File root.tsx not found');
  }

  const imports = content
    .getImportDeclarations()
    .flatMap((x) => x.getNamedImports())
    .map((x) => x.getText());

  return imports;
}

// Run function if file is executed directly from CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const pathToProject = args[0];

  if (!pathToProject) {
    console.error(
      'Usage: bun find-all-modules.ts <pathToProject> [moduleInterface]'
    );
    process.exit(1);
  }

  const result = findAllRootImports(pathToProject);
  console.log(JSON.stringify(result));
}
