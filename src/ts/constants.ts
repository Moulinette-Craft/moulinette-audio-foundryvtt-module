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
 * Some constants which are configurable on runtime
 */
export default class MouConfig {
  static MAX_ROWS = 30
  static MAX_COLS = 30
}