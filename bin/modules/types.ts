export type ModuleDefinition = {
  id: string;
  name: string;
  description: string | null;
  groups: string[] | null;
  import: string;
  dependencies: string[];
  variables: {
    name: string;
    required: boolean;
    type: 'string' | 'boolean';
    default?: boolean | string | null;
    schema?: string;
  }[];
  plugin: (string | [string, Record<string, any>])[];
};
