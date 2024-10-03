import { id } from "../module.json";


export const MODULE_ID = id;
export const MODULE_MOULINETE_ID = "moulinette";
export const SETTINGS_SOUNDBOARDS = "soundboards"
export const SETTINGS_SOUNDBOARD_ALLOW_PLAYERS = "soundboards_allow_players"
export const SETTINGS_SOUNDPAD_CREATOR = "soundpad_creator"
export const SETTINGS_SOUNDPAD_VOLUME = "soundpad_volume"
export const SETTINGS_SOUNDPAD_HIDE_CONTROLS = "soundpad_hide_controls"
export const SETTINGS_SOUNDPAD_HIDDEN_FILES = "soundpad_hidden_files"
export const SETTINGS_SOUNDPAD_NO_TTA_WARNING = "soundpad_no_tta_warning"
export const FOUNDRYVTT_PLAYLIST_ENTRY = "PlaylistSound"

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

  /** Soundpads */
  static AMBIENT_SOUND_RADIUS = 10 // default radius used for ambient sounds (drag & drop action)
}