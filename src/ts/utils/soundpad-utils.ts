import MouApplication from "../apps/application";
import { AnyDict } from "../types";

export class MouSoundpadUtils {
  
  static indexingInProgress = false

  /**
   * Generates a folder structure based on the index
   * lastFolderOnly : /Music/SFX/Games => Games
   */
  static foldersFromIndex(files: AnyDict[], lastFolderOnly = false) : AnyDict {
    // sanity check
    if(files.length == 0) return {}
    
    let folders = {} as AnyDict
    let id = 0;

    // sort all files back into their folders
    for(const f of files) {
      id++;
      const idx = f.filepath.lastIndexOf('/')
      let parent = idx < 0 ? "" : f.filepath.substring(0, idx)
      if(lastFolderOnly) {
        parent = parent.split("/").pop()
      }
      parent += "/"

      f.idx = id
      if(parent in folders) {
        folders[parent].push(f)
      } else {
        folders[parent] = [f]
      }
    }
    
    return folders;
  }

  /**
   * Changing this implementation is against Terms of Use / License
   * https://tabletopaudio.com/about.html
   * 
   * @returns true if user may not download sounds from TTA
   */
  static noTTADownload() : boolean {
    const moulinette = MouApplication.getMoulinetteModule()
    if(!moulinette) return true

    const user = moulinette.cache.user

    // 5$, 10$, 20$, 50$ can download sounds
    const TTA = ["362213", "362214", "362215", "362216"]
    const three = user.pledges ? user.pledges.find((p : AnyDict) => p.id == "362212") : null
    const fiveOrMore = user.pledges ? user.pledges.find((p : AnyDict) => TTA.includes(p.id)) : null
    // 3$ but not 5$+? => filter assets out
    return three && !fiveOrMore
  }

    /**
   * Reads a given URL (json) and builds an asset index
   */
  static async getSoundpadSounds(creator: string) : Promise<{ assets: AnyDict[], packs: AnyDict[] }> {
    let assets = [] as AnyDict[]
    const moulinette = MouApplication.getMoulinetteModule()
      
    // try to load from cache when exists
    let data: AnyDict[]
    if(moulinette.cache.soundpads && moulinette.cache.soundpads[creator]) {
      data = moulinette.cache.soundpads[creator]
    } 
    else { 
      data = await moulinette.cloudclient.apiGET(`/soundpads/sounds/${creator}`, { session: moulinette.getSessionId() })
      if(!moulinette.cache.soundpads) {
        moulinette.cache.soundpads = {}
      }
      moulinette.cache.soundpads[creator] = data
    }
    
    const assetsPacks = {} as AnyDict
    for(const asset of data) {
      if(!(asset.pack.pack_ref in assetsPacks)) {
        assetsPacks[asset.pack.pack_ref] = asset.pack
      }
      assets.push(asset)
    }
    
    return { assets: assets, packs: Object.values(assetsPacks) }
  }
}