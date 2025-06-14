// Global version counter for tracking signal updates
let globalVersion = 0;

export function nextVersion(): number {
  return ++globalVersion;
}

export function currentVersion(): number {
  return globalVersion;
}
