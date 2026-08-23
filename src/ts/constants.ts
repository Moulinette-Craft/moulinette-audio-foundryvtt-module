import { id } from "../module.json";


export const MODULE_ID = id;
export const MODULE_MOULINETTE_ID = "moulinette";
export const SETTINGS_SOUNDBOARDS = "soundboards"
export const SETTINGS_SOUNDBOARD_ALLOW_PLAYERS = "soundboards_allow_players"
export const SETTINGS_SOUNDPAD_CREATOR = "soundpad_creator"
export const SETTINGS_SOUNDPAD_VOLUME = "soundpad_volume"
export const SETTINGS_SOUNDPAD_CHANNEL = "soundpad_channel"
export const SETTINGS_SOUNDPAD_HIDE_CONTROLS = "soundpad_hide_controls"
export const SETTINGS_SOUNDPAD_HIDDEN_FILES = "soundpad_hidden_files"
export const SETTINGS_SOUNDPAD_NO_TTA_WARNING = "soundpad_no_tta_warning"
export const FOUNDRYVTT_PLAYLIST_ENTRY = "PlaylistSound"

export const MOU_STORAGE = "https://mttestorage.blob.core.windows.net/"

// cols/rows: how many grid cells the slot spans horizontally/vertically (matches
// the .sizeXY width/height overrides in _soundboard.scss - X is the column span,
// Y the row span).
export const SLOT_SIZES = [
  { class: 1,  cols: 1, rows: 1 },
  { class: 2,  cols: 2, rows: 1 },
  { class: 3,  cols: 3, rows: 1 },
  { class: 12, cols: 1, rows: 2 },
  { class: 13, cols: 1, rows: 3 },
  { class: 22, cols: 2, rows: 2 },
  { class: 32, cols: 3, rows: 2 },
  { class: 23, cols: 2, rows: 3 },
  { class: 33, cols: 3, rows: 3 }]

/**
 * The constants below can be overridden using the following macro :
 * `game.modules.get("moulinette-soundboards").configs.[CONFIG_NAME] = [NEW_VALUE]`
 * 
 * Example:
 * `game.modules.get("moulinette-soundboards").configs.MAX_ROWS = 10`
 */
export default class MouConfig {

  /** Soundboards */
  static MAX_ROWS = 30 // max number of allowed rows
  static MAX_COLS = 30 // max number of allowed columns
  static DEFAULT_ROWS = 3
  static DEFAULT_COLS = 10

  /** Soundpads */
  static AMBIENT_SOUND_RADIUS = 10 // default radius used for ambient sounds (drag & drop action)
}