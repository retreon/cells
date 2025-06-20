# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-06-20

### Changed

- `watch()` no longer eagerly evaluates formulas. Instead, it returns a `[dispose, renew]` tuple and delegates evaluation to the caller.

## [0.1.1] - 2025-06-18

### Fixed

- An edge case on `source` change events allowed stale reads.

## [0.1.0] - 2025-06-15

### Added

- Core reactive cell system with cells, formulas, and sources
- Batched updates
- Automatic dependency tracking and change propagation
- Watchers for observing changes

[Unreleased]: https://github.com/retreon/cells/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/retreon/cells/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/retreon/cells/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/retreon/cells/releases/tag/v0.1.0
