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
      const idx = f.filename.lastIndexOf('/')
      let parent = idx < 0 ? "" : f.filename.substring(0, idx)
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
  static async getSoundpadSounds() : Promise<{ assets: AnyDict[], packs: AnyDict[] }> {
    let assets = [] as AnyDict[]
    let assetsPacks = [] as AnyDict[]
    const moulinette = MouApplication.getMoulinetteModule()

    if(MouSoundpadUtils.indexingInProgress || !moulinette) return { assets: assets, packs: assetsPacks }
    MouSoundpadUtils.indexingInProgress = true
    
    //const progressbar = (new game.moulinette.applications.MoulinetteProgress(game.i18n.localize("mtte.indexingMoulinette")))
    //progressbar.render(true)

    // build tiles' index 
    let idx = 0;
    //progressbar.setProgress(Math.round((idx / urlList.length)*100))
    
    // try to load from cache when exists
    let data: AnyDict[]
    if(moulinette.cache.soundpads) {
      data = moulinette.cache.soundpads
    } 
    else { 
      data = await moulinette.cloudclient.apiGET("/soundpads/sounds", { session: moulinette.getSessionId() })
      moulinette.cache.soundpads = data
    }
    
    try {
      for(const creator of data) {
        for(const pack of creator.packs) {
          // add pack
          const packData = {
            idx: idx,
            packId: pack.id,
            publisher: creator.publisher,
            pubWebsite: creator.website,
            name: pack.name,
            url: pack.url,
            license: pack.license,
            licenseUrl: pack.licenseUrl,
            path: pack.path,
            count: pack.assets.length,
            isLocal: pack.isLocal,
            isFree: pack.free,
            source: pack.source,
            sas: pack.sas
          }
          for(let i = 0; i<pack.assets.length; i++) {
            let asset = pack.assets[i]
            // SAS for individual asset
            const sas = Array.isArray(pack.sas) ? [pack.sas[2*i],pack.sas[2*i+1]] : null
            if(asset.type == "snd") {
              const aData = { 
                pack: idx, 
                filename: asset.path, 
                type: asset.type, 
                duration: asset.duration, 
                loop: asset.loop, 
                title: asset.title, 
                cat: asset.cat, 
                order: asset.order 
              } as AnyDict
              if(sas) { aData['sas'] = sas[0] }
              assets.push(aData)
            }
          }
          assetsPacks.push(packData)
          idx++;
        }
      }
    } catch (e) {
      console.log(`Moulinette FileUtil | Error building index of ${URL}`, e)
    }
    //progressbar.setProgress(100)
    
    MouSoundpadUtils.indexingInProgress = false
    return { assets: assets, packs: assetsPacks }
  }
}