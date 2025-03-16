import MouConfig, { MODULE_ID, MODULE_MOULINETTE_ID, SETTINGS_SOUNDBOARDS } from "../constants";
import { AnyDict, MouModule } from "../types";

/**
 * This class server allow Moulinette Application to be independant from FVTT
 */
export default class MouApplication extends Application {
 
  static APP_NAME = "MouApplication";

  APP_NAME = "Moulinette Audio";        // default application name

  static logDebug(source: string, message: string, data?: any) {
    const module = MouApplication.getModule()
    if(module.debug) {
      if(data !== undefined) {
        console.debug(`${source} | ${message}`, data); 
      } else {
        console.debug(`${source} | ${message}`); 
      }
    }
  }

  static logInfo(source: string, message: string, data?: any) {
    if(data !== undefined) {
      console.log(`${source} | ${message}`, data); 
    } else {
      console.log(`${source} | ${message}`); 
    }
  }

  static logWarn(source: string, message: string, data?: any) {
    if(data !== undefined) {
      console.warn(`${source} | ${message}`, data); 
    } else {
      console.warn(`${source} | ${message}`); 
    }
  }

  static logError(source: string, message: string, data?: any, error?: any) {
    if(data !== undefined) {
      console.error(`${source} | ${message}`, data); 
    } else {
      console.error(`${source} | ${message}`); 
    }
    if(error) {
      console.error(error)
    }
  }

  logDebug(message: string, data?: any) { MouApplication.logDebug(this.APP_NAME, message, data) }
  logInfo(message: string, data?: any) { MouApplication.logInfo(this.APP_NAME, message, data) }
  logWarn(message: string, data?: any) { MouApplication.logWarn(this.APP_NAME, message, data) }
  logError(message: string, data?: any, error?: Error) { MouApplication.logError(this.APP_NAME, message, data, error) }

  static getModule(): MouModule {
    return (game as Game).modules.get(MODULE_ID) as MouModule;
  }

  static getMoulinetteModule(): any {
    return (game as Game).modules.get(MODULE_MOULINETTE_ID) as MouModule;
  }

  static async setSettings(key: string, value: unknown) : Promise<unknown> {
    MouApplication.logDebug(MouApplication.APP_NAME, `Storing data for settings ${key}`)
    return (game as Game).settings.set(MODULE_ID, key, value)  
  }

  static getSettings(key: string): unknown {
    return (game as Game).settings.get(MODULE_ID, key)
  }

  /** Forces FoundryVTT to automatically resize the window (when auto) */
  autoResize() {
    this.setPosition({ left: this.position.left, top: this.position.top, height: this.position.height, width: this.position.width})
  }

  /**
   * Retrieves the soundboard settings for the current user.
   *
   * @returns {AnyDict} The soundboard settings for the current user. If no settings are found, returns an empty object.
   * @throws {Error} If the user ID is invalid or not found.
   */
  static getUserSoundboard(boardIdx: number = -1): AnyDict {
    const userId = (game as Game).user?.id
    if(!userId || userId.length == 0) {
      throw new Error("Invalid user")
    }
    const data = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
    
    // legacy (single board) => convert to multiple boards
    if(!("boards" in data)) {
      const migrated = { 
        boards: [data],
        current: 0
      }
      MouApplication.setSettings(SETTINGS_SOUNDBOARDS, migrated)
      return data
    }

    return boardIdx >= 0 ? data.boards[boardIdx] : data.boards[data.current]
  }

  /**
   * Sets the user's soundboard settings.
   *
   * @param soundboard - An object representing the soundboard settings to be saved.
   * @returns A promise that resolves when the settings have been successfully saved.
   * @throws Will throw an error if the user ID is invalid or not found.
   */
  static async setUserSoundboard(soundboard: AnyDict, boardIdx: number = -1): Promise<void> {
    const userId = (game as Game).user?.id
    if(!userId || userId.length == 0) {
      throw new Error("Invalid user")
    }

    // overwrite the current soundboard
    const data = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
    data.boards[boardIdx >= 0 ? boardIdx : data.current] = soundboard

    await MouApplication.setSettings(SETTINGS_SOUNDBOARDS, data)
  }

  /**
   * Deletes the specified soundboard.
   * If it's the last board, only clears it.
   *
   * @param soundboard - An object representing the soundboard settings to be saved.
   * @returns A promise that resolves when the settings have been successfully saved.
   * @throws Will throw an error if the user ID is invalid or not found.
   */
  static async deleteSoundboard(boardIdx: number = -1): Promise<void> {
    const userId = (game as Game).user?.id
    if(!userId || userId.length == 0) {
      throw new Error("Invalid user")
    }

    // overwrite the current soundboard
    const data = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
    if(data.boards.length == 1) {
      data.boards[0] = { name: "Default" }
    } else {
      // update current pointer
      if(boardIdx <= data.current) {
        data.current -= 1
      }
      data.boards.splice(boardIdx >= 0 ? boardIdx : data.current, 1);
    }

    await MouApplication.setSettings(SETTINGS_SOUNDBOARDS, data)
  }

  /**
   * Creates a new soundboard.
   *
   * @param name - Soundboard's name
   * @returns A promise that resolves when the settings have been successfully saved.
   * @throws Will throw an error if the user ID is invalid or not found.
   */
  static async createSoundboard(name: string): Promise<void> {
    const userId = (game as Game).user?.id
    if(!userId || userId.length == 0) {
      throw new Error("Invalid user")
    }

    // overwrite the current soundboard
    const data = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
    data.boards.push({ name: name, cols: MouConfig.DEFAULT_COLS, rows: MouConfig.DEFAULT_ROWS })
    data.current = data.boards.length -1

    await MouApplication.setSettings(SETTINGS_SOUNDBOARDS, data)
  }


  /**
   * Retrieves the list of soundboards from the application settings.
   *
   * @returns {Promise<AnyDict[]>} A promise that resolves to an array of soundboard objects.
   * Each soundboard object contains the following properties:
   * - `name` (string): The name of the soundboard.
   * - `idx` (number): The index of the soundboard.
   */
  static async getSounboardList(): Promise<AnyDict[]> {
    const data = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
    const boards = data.boards.map((board: AnyDict, index: number) => {
      return {
        name: board.name ? board.name : "Default",
        idx: index,
        selected: index == data.current
      }
    });
    return boards.sort((a: AnyDict,b: AnyDict) => a.name.localeCompare(b.name))
  }

  /**
   * Sets the current soundboard
   *
   * @throws {Error} If the user ID is invalid or not found.
   */
  static async setCurrentSoundboard(boardIdx: number): Promise<void> {
    const userId = (game as Game).user?.id
    if(!userId || userId.length == 0) {
      throw new Error("Invalid user")
    }
    const data = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
    if(boardIdx >= 0 && boardIdx < data.boards.length) {
      data.current = boardIdx
    }

    await MouApplication.setSettings(SETTINGS_SOUNDBOARDS, data)
  }
}