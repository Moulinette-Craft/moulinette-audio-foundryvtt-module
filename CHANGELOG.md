# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [14.0.0] - 2026-08-30
> Starting with this release, the module version tracks the targeted FoundryVTT
> major version (this one is for Foundry v14). The previous release was 1.3.0.

### Changed
- Rewrote every application (Soundboard, Soundboard editor, Soundboard name, Soundpads) on the FoundryVTT ApplicationV2 / HandlebarsApplicationMixin API
- Minimum supported FoundryVTT version is now 13; v12 is no longer supported (verified up to v14)
- Updated the build toolchain and dependencies (Vite 5, TypeScript 5, `fvtt-types`)

### Fixed
- Soundpads: sounds were downloaded but never played on the first click - play/stop now goes through the Playlist API
- Soundpads: right-click to hide/show individual sounds and whole folders was broken (wrong asset/pack references after the data-model change)
- Soundpads: hidden folder labels stayed white instead of turning red
- Soundpads: the window now uses the full available height instead of leaving an empty strip at the bottom
- Soundpads: the creator logo in the header is no longer clipped or mis-sized
- Soundboard: multi-cell slots (1x2, 1x3, 2x2, 2x3, 3x2, 3x3) are now laid out on a CSS grid and no longer overlap or push aside neighbouring slots
- Soundboard: the currently playing sound was not highlighted on its very first play
- Soundboard: layout regressions under ApplicationV2 - oversized title, grid overflowing past the board list, and outdated localization keys

## [1.3.0] - 2026-04-26
### Added
- Support for FoundryVTT v.14

## [1.2.3] - 2025-05-11
### Fixed
- 1.2.1: Sounds controls disappears from menu when switching scenes
- 1.2.2: Errors on startup (ready())
- 1.2.3: Import Config error persists v1.7.1 #8
### Added
- Support for FoundryVTT v.13

## [1.1.2] - 2025-03-15
### Fixed
- 1.1.1: Fix missing macros in pack
- 1.1.2: Fix sound volume for previews
### Added
- Add Audio channel, Repeat and Fade duration for Soundboards
- Add Audio channel for Soundpads
- Support more sizes (1x2, 1x3, 2x2, 2x3, 3x2 and 3x3)
- Support icons/images with sizes different from 1x1
- Soundboard collections
- Toggle visibility for unused slots

## [1.0.7] - 2025-01-06
### Fixed
- 1.0.6: various tests and modifications to automate the modules' releases
- 1.0.7: repository moved to MoulinetteCraft organization
### Added
- Initial public release (MIT license)
