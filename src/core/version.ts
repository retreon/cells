// Global version counter for tracking signal updates
export let globalVersion = 0;

export function nextVersion(): number {
  return ++globalVersion;
}
