import MouApplication from "../apps/application";
import { FOUNDRYVTT_PLAYLIST_ENTRY, MODULE_ID } from "../constants";
import { AnyDict } from "../types";

export class MouSoundboardUtils {
  
  /**
   * Play a given sound
   */
  static async playSound(fromUser: string, audio: AnyDict) {
    // if not GM, ask GM to play sound
    if (!(game as Game).user?.isGM) {
      (game as Game).socket?.emit(`module.${MODULE_ID}`, {
        type: "playSound",
        user: (game as Game).user?.name,
        audio: audio
      });
      return
    }
    const playlistName = `${(game as Game).i18n.localize("MOUSND.soundboard_name")}: ${fromUser}`
    const volume = audio.volume ? Number(audio.volume) : 1.0
    // get playlist
    let playlist = (game as Game).playlists?.find( (pl : any) => pl.name == playlistName)
    if(!playlist) {
      const moulinette = MouApplication.getMoulinetteModule()
      const folder = moulinette ? await moulinette.utils?.foundry.getOrCreateFolder("Playlist", "Moulinette") : null
      playlist = await Playlist.create({name: playlistName, mode: -1, folder: folder })
      if(!playlist) return;
    }
    let path = audio.path
    if(path.length > 1) {
      const rand = Math.floor((Math.random() * path.length));
      path = path[rand]
    } else {
      path = path[0]
    }
    // get sound
    let sound = playlist.sounds.find( s => s.path == path )
    if(Array.isArray(sound)) sound = sound[0] // just in case multiple sounds have the same path
    if(!sound) {
      // 1. get filename from path, 2. trim extension
      const name = decodeURIComponent(path.split("/").pop()).replace(/\.[^/.]+$/, "")
      sound = (await playlist.createEmbeddedDocuments(FOUNDRYVTT_PLAYLIST_ENTRY, [{name: name, path: path, volume: volume}], {}))[0] as PlaylistSound
    }
    if(sound.playing) {
      playlist.stopSound(sound)
    } else {
      sound.update({ volume: volume })
      playlist.playSound(sound)
    }
  }


  /**
   * Updates the currently playing sound in the given playlist based on the provided update data.
   * 
   * @param playlist - The playlist containing the sounds to be updated.
   * @param updateData - The data containing updates for the sounds. It should include an array of sound updates.
   * 
   * @remarks
   * This function iterates through the sounds in the update data and finds the corresponding sound in the playlist.
   * If a matching sound is found, it updates the sound using the `updatePlaySound` method from the soundboard module.
   * 
   * @returns A promise that resolves when the update operation is complete.
   */
  static async updatePlayingSound(playlist : Playlist, updateData: any) {
    if (updateData.sounds) {
      for(const s of updateData.sounds) {
        const sound = playlist.sounds.find(snd => snd.id == s._id) as PlaylistSound
        if(sound) {
          MouApplication.getModule().soundboard.updatePlaySound(sound.path as string, s.playing)
        }
      }
    }
  }
}