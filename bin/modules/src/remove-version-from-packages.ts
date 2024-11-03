export function removeVersionFromPackages(packages: string): string {
  // Regex to match both scoped and unscoped packages followed by an optional version
  const versionRegex = /(@?[a-zA-Z0-9-_]+\/?[a-zA-Z0-9-_]*)(@[^\s,]+)?/g;

  // Replace the version part with an empty string, keeping only the package name
  return packages.replace(versionRegex, '$1');
}
