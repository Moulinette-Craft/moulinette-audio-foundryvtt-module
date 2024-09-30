import { id } from "../module.json";


export const MODULE_ID = id;
export const MODULE_MOULINETE_ID = "moulinette";
export const SETTINGS_SOUNDBOARDS = "soundboards"
export const SETTINGS_SOUNDBOARD_ALLOW_PLAYERS = "soundboards_allow_players"
export const FOUNDRYVTT_PLAYLIST_ENTRY = "PlaylistSound"

/**
 * Some constants which are configurable on runtime
 */
export default class MouConfig {
  static MAX_ROWS = 30
  static MAX_COLS = 30
}