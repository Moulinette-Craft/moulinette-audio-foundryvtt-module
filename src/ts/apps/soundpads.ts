import MouConfig, { MODULE_ID, SETTINGS_SOUNDPAD_CREATOR, SETTINGS_SOUNDPAD_HIDDEN_FILES, SETTINGS_SOUNDPAD_HIDE_CONTROLS, SETTINGS_SOUNDPAD_NO_TTA_WARNING, SETTINGS_SOUNDPAD_VOLUME } from "../constants"
import { AnyDict } from "../types"
import MouMediaUtils from "../utils/media-utils"
import { MouSoundpadUtils } from "../utils/soundpad-utils"
import MouApplication from "./application"

/*************************
 * Moulinette SoundPads
 *************************/
export class MouSoundPads extends MouApplication {

  override APP_NAME = "MouSoundPads";
  static MOULINETTE_PLAYLIST  = "#CREATOR# (Moulinette)"
  
  static CREATORS = {
    tabletopaudio : "Tabletop Audio",
    michaelghelfi : "Michael Ghelfi"
  } as AnyDict

  private creator?: string
  private previewTimeout?: ReturnType<typeof setTimeout> // timeout object for preview (to stop sound on close)
  private previewSound: HTMLAudioElement
  private showAll: boolean

  // temporary storage
  private sounds?: AnyDict
  private packs?: AnyDict
  private folders?: AnyDict
  private html?: JQuery<HTMLElement>
  private category?: string
  
  constructor() {
    super()
    this.previewSound = new Audio()
    this.showAll = false
  }
  
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-soundpads",
      classes: ["mou"],
      title: (game as Game).i18n.localize("MOUSND.soundpads"),
      template: `modules/${MODULE_ID}/templates/soundpads.hbs`,
      top: 0,
      left: 0,
      width: 250,
      height: 30000, // force 100%
      dragDrop: [{dragSelector: ".draggable"}],
      resizable: true,
      minimizable: false,
      closeOnSubmit: true,
      submitOnClose: false
    });
  }

  static cleanSoundName(filename: string) {
    let soundName = filename.replaceAll(".ogg", "").replaceAll("loop", "").replaceAll("_", " ").replaceAll("-", " ").replace("/", " / ")

    // uppercase first letter of each word
    soundName = soundName.split(" ").map((word) => {
        return word.length == 0 ? "" : word[0].toUpperCase() + word.substring(1);
    }).join(" ");

    return soundName
  }
  
  override async getData() {
    const savedCreator = MouApplication.getSettings(SETTINGS_SOUNDPAD_CREATOR) as string
    if(savedCreator && savedCreator in MouSoundPads.CREATORS) {
      this.creator = savedCreator
    } else {
      this.creator = "tabletopaudio"
    }
    
    const moulinette = MouApplication.getMoulinetteModule()
    if(!moulinette) {
      throw new Error((game as Game).i18n.localize("MOUSND.error_moulinette_required"))
    }
    
    const index = await MouSoundpadUtils.getSoundpadSounds()
    const categories = [] as AnyDict[]
    let sounds = []


    const soundpadPacks = index.packs.filter((p : AnyDict) => p.publisher == MouSoundPads.CREATORS[this.creator!])
    const packIds = soundpadPacks.map((p : AnyDict) => p.idx)
    sounds = index.assets.filter((s : AnyDict) => packIds.includes(s.pack))
    for(const s of sounds) {
      s.name = s.title ? s.title : MouSoundPads.cleanSoundName(s.filename.split("/").pop())
      if(s.cat) {
        const categs = []
        for(const c of s.cat) {
          const categ = c.toLowerCase()
          categs.push(categ)
          if(!categories.includes(categ)) {
            categories.push(categ)
          }
        }
        s.cat = categs
      } 
    }

    // keep references for later usage
    this.sounds = sounds
    this.packs = soundpadPacks
    this.folders = MouSoundpadUtils.foldersFromIndex(sounds, true)
    
    // music without folder should be alternates => try to match them
    if("/" in this.folders) {
      for(const snd of this.folders["/"]) {
        // find match based on prefix
        const idx = snd.filename.indexOf("_")
        if(idx <= 0) continue
        const prefix = snd.filename.substring(0, idx)
        Object.keys(this.folders).forEach(key => {
          const match = this.folders![key].find((s : AnyDict) => s.filename.indexOf(`/${prefix}_`) >= 0)
          if(match) {
            if(!match.alt) {
              match.alt = [snd]
            } else {
              match.alt.push(snd)
            }
          }
          return
        });
      }
    }
    delete this.folders["/"]

    const keys = Object.keys(this.folders).sort()
    const assets = []
    for(const k of keys) {
      const folderName = k.slice(0, -1).split('/').pop()!.replace(/\([^\)]+\)/, "")
      assets.push(`<div class="folder" data-path="${k}"><h2 class="expand"><i class="fas fa-folder"></i> ${folderName} (${this.folders[k].length})</h2><div class="assets">`)
      // sort by order, then name
      const sounds = this.folders[k].sort((a : AnyDict, b : AnyDict) => a.order != b.order ? a.order - b.order : a.name.localeCompare(b.name))
      for(const a of sounds) {
        let variants = 0
        let variantsHTML = ""
        if(a.alt) {
          variantsHTML += MouSoundPads.generateSoundAltHTML(a, a)
          for(const alt of a.alt) {
            variants++
            variantsHTML += MouSoundPads.generateSoundAltHTML(a, alt)
          }
        }

        const tagsHTML = a.tags ? `title="${a.tags}"` : ""
        const categHTML = a.cat ? `data-cat="${a.cat}"` : ""
        const soundHTML = MouSoundPads.generateSoundHTML(a, tagsHTML, categHTML, variants) + variantsHTML
        assets.push(soundHTML)
      }
      assets.push("</div></div>")
    }

    return { 
      MODULE_ID,
      assets, 
      categories,
      creator: this.creator,
      'noAsset': this.sounds!.length == 0, 
      'volume': (foundry as AnyDict).audio.AudioHelper.volumeToInput(MouApplication.getSettings(SETTINGS_SOUNDPAD_VOLUME)) 
    }
  }

  /**
   * Generates HTML for 1 single sound
   */
  static generateSoundHTML(a : AnyDict, tagsHTML : string, categHTML : string, variants : number) {
    return `<div class="sound ${ variants > 0 ? "expandable" : "draggable" }" data-idx="${a.idx}"><i class="fas fa-music"></i>&nbsp;` +
      `<span class="audio" ${tagsHTML} ${categHTML}>${a.name}${a.filename.toLowerCase().includes("loop") ? ' <i class="fas fa-sync fa-xs"></i>' : "" }` +
      (variants > 0 ? ` (${variants}) <i class="exp fa-solid fa-angles-down"></i>` : "") +
      `</span><span class="duration">${MouMediaUtils.prettyDuration(a.duration)}</span> </div>`
  }

  /**
   * Generates HTML for 1 single alternate sound
   */
  static generateSoundAltHTML(orig : AnyDict, alt : AnyDict) {
    const regex = /\(([^\)]+)\)/g; // extract text in parenthesis
    const result = regex.exec(alt.name);
    const name = result ? result[1] : alt.name
    return `<div class="sound draggable alt" data-parent="${orig.idx}" data-idx="${alt.idx}"><i class="fa-solid fa-compact-disc"></i>&nbsp;` +
      `<span class="audio">${name}${alt.filename.toLowerCase().includes("loop") ? ' <i class="fas fa-sync"></i>' : "" }` +
      `</span><span class="duration">${MouMediaUtils.prettyDuration(alt.duration)}</span> </div>`
  }


  /**
   * Implements listeners
   */
  override activateListeners(html: JQuery<HTMLElement>) {
    if(MouApplication.getSettings(SETTINGS_SOUNDPAD_HIDE_CONTROLS)) {
      $("#controls").hide()
      $("#logo").hide()
      $("#navigation").hide()
      $("#players").hide()
    }

    // keep html for later usage
    this.html = html
    const parent = this

    // enable expand listeners
    html.find(".expand").on("click", this._onToggleExpand.bind(this));

    // play sound on click
    html.find(".sound.draggable").on("click", this._onPlaySound.bind(this));

    // show alternates sounds
    html.find(".sound.alt").hide()
    html.find(".sound.expandable").on("click", ev => {
      const icon = $(ev.currentTarget).find("i.exp")
      const idx = $(ev.currentTarget).data("idx")
      if(icon.hasClass("fa-angles-down")) {
        html.find(`[data-parent='${idx}']`).show()
        icon.removeClass("fa-angles-down")
        icon.addClass("fa-angles-up")
      } else {
        html.find(`[data-parent='${idx}']`).hide()
        icon.removeClass("fa-angles-up")
        icon.addClass("fa-angles-down")
      }      
    });

    // toggle on right click
    html.find(".expand").on("mousedown", (ev) => this._onMouseDown(ev))
    html.find(".sound:not(.alt)").on("mousedown", (ev) => this._onMouseDown(ev))

    // preview sound
    html.find(".sound").on("mouseenter", (ev) => this._onPreviewSound(ev))
    html.find(".sound").on("mouseleave", () => this._onStopPreviewSound())

    // put focus on search
    html.find("#search").trigger("focus");

    // actions
    html.find('.action').on("click", this._onAction.bind(this))

    // creators' tab
    html.find('.othersoundpads a').on("click", ev => {
      ev.preventDefault()
      const link = ev.currentTarget
      for(const creatorKey of Object.keys(MouSoundPads.CREATORS)) {
        if(link.classList.contains(creatorKey)) {  
          this.creator = creatorKey
          MouApplication.setSettings(SETTINGS_SOUNDPAD_CREATOR, creatorKey).then(() => { this.render(true) })
        }
      }
    })

    // categories
    html.find(".categories a").on("click", ev => {
      ev.preventDefault();
      const cat = $(ev.currentTarget).data("id")
      html.find(".categories a").removeClass("selected")
      parent.category = parent.category == cat ? null : cat
      // highlight selected
      if(parent.category) {
        $(ev.currentTarget).addClass("selected")
      }
      parent._onSearch(false)
    })

    // patreon authentication
    html.find(".mouAuthenticate").on("click", ev => { 
      ev.preventDefault();
      MouApplication.getMoulinetteModule().render(true);
      return false; 
    })

    // keep in settings
    html.find('.sound-volume').on("change", event => this._onSoundVolume(event));

    // toggle visibility
    html.find('.toggleVisibility').on("click", event => {
      parent.showAll = !parent.showAll
      parent.toggleVisibility()
      $(event.currentTarget).find("i").attr("class", parent.showAll ? "fas fa-eye" : "fas fa-eye-slash")
      parent._onSearch(false)
    })

    // put focus on search
    if(this.folders!.length === 0) {
      html.find(".error").show()
    } else {
      html.find("#search").on('input', () => this._onSearch());
    }

    this.toggleVisibility()
  }

  /**
   * Show or hide entries based on settings
   */
  private toggleVisibility() {
    if(!this.packs || !this.sounds) return;
    const showAll = this.showAll
    // make all visible
    this.html?.find(".folder").show().removeClass("mtteHide")
    this.html?.find(".sound:not(.alt)").show()
    this.html?.find(".sound").removeClass("mtteHide")
    // show/hide
    const hidden = MouApplication.getSettings(SETTINGS_SOUNDPAD_HIDDEN_FILES) as AnyDict
    const packIds = this.packs.map((p : AnyDict) => p.packId.toString())
    
    // toggle visibility (files)
    for(const packId of packIds) {
      if(packId in hidden) {
        const filtered = hidden[packId]
        const sounds = this.sounds
        const parent = this
        this.html?.find(".sound:not(.alt)").each(function(idx, s) {
          idx; // unused
          const sndIdx = $(s).data('idx')
          if(filtered.includes(sounds[sndIdx-1].filename)) {
            $(s).addClass("mtteHide")
            parent.html?.find(`.sound.alt[data-parent='${sndIdx}']`).addClass("mtteHide")
            if(!showAll) {
              $(s).hide()
              parent.html?.find(`.sound.alt[data-parent='${sndIdx}']`).hide()
            }
          }
        })
      }
    }

    // toggle visibility (folders)
    if('folders' in hidden) {
      const filtered = hidden['folders']
      this.html?.find(".folder").each(function(idx, f) {
        idx; // unused
        if(filtered.includes($(f).data('path'))) {
          $(f).addClass("mtteHide")
          if(!showAll) {
            $(f).hide()
          }
        }
      })
    }
    
  }

  private _onSoundVolume(event : JQuery.ChangeEvent) {
    event.preventDefault();
    const slider = event.currentTarget as HTMLInputElement;

    // store as setting
    const volume = (foundry as AnyDict).audio.AudioHelper.inputToVolume(slider.value);
    if ((game as Game).user!.isGM) {
      MouApplication.setSettings(SETTINGS_SOUNDPAD_VOLUME, volume);
    }
  }

  /**
   * Handles the mouse down (right click) event on soundpad elements.
   * 
   * @param event - The mouse down event triggered by the user.
   * 
   * The method ensures that the visibility state of soundpad elements is properly managed and persisted in the application settings.
   */
  private async _onMouseDown(event: JQuery.MouseDownEvent) {
    // right click
    if(event.button == 2) {
      const source = event.currentTarget as HTMLElement
      if(!source) return
      let key = null
      let pack = null
      if(source.classList.contains("expand")) {
        const folder = $(source).closest('.folder')
        key = folder.data('path')
        if(key) {
          if(!this.showAll) {
            $(folder).toggle()
          }
          $(folder).toggleClass("mtteHide")
        }
      } 
      else {
        const idx = $(source).data('idx')
        if(idx && idx > 0 && idx <= this.sounds!.length) {
          key = this.sounds![idx-1].filename
          pack = this.packs!.find((p : AnyDict) => p.idx == this.sounds![idx-1].pack)
          $(source).toggleClass("mtteHide")
          this.html!.find(`.sound.alt[data-parent='${idx}']`).toggleClass("mtteHide")
          if(!this.showAll) {
            $(source).toggle()
            this.html!.find(`.sound.alt[data-parent='${idx}']`).hide()
          }
        }
      }

      if(!key) return;
      const hidden = MouApplication.getSettings(SETTINGS_SOUNDPAD_HIDDEN_FILES) as AnyDict

      // hide 1 single element (pack not null) or entire folder (pack null)
      const packId = pack ? pack.packId.toString() : "folders"
      if(!(packId in hidden)) {
        hidden[packId] = []
      }
      if(hidden[packId].includes(key)) {
        const idx = hidden[packId].indexOf(key)
        hidden[packId].splice(idx, 1)
      } else {
        hidden[packId].push(key)
      }
      
      await MouApplication.setSettings(SETTINGS_SOUNDPAD_HIDDEN_FILES, hidden)
    }
  }

  override async close(): Promise<void> {
    await super.close();
    if(MouApplication.getSettings(SETTINGS_SOUNDPAD_HIDE_CONTROLS)) {
      $("#controls").show();
      $("#logo").show();
      $("#navigation").show();
      $("#players").show();
    }
  }

  /**
   * Show/hide assets in one specific folder
   */
  private _onToggleExpand(event : Event) {
    event.preventDefault();
    const source = event.currentTarget as HTMLElement
    if(!source) return
    const folderEl = $(source).closest('.folder')
    const assets = folderEl.find(".assets")
    assets.toggle()
    folderEl.find("h2 i").attr("class", assets.css('display') == 'none' ? "fas fa-folder" : "fas fa-folder-open")
  }

  /**
   * Show/hide assets in one specific folder
   */
  private _onAction(event : Event) {
    event.preventDefault();
    const source = event.currentTarget as HTMLElement
    if(!source) return
  }


  override _onDragStart(event : DragEvent) {
    if(!event.currentTarget) return
    const soundIdx = $(event.currentTarget).data('idx')

    if(MouSoundpadUtils.noTTADownload()) {
      return this.logWarn((game as Game).i18n.localize("MOUSND.tta_warning_nodownload"))
    }

    // sounds
    if(soundIdx && soundIdx > 0 && soundIdx <= this.sounds!.length) {
      const soundData = this.sounds![soundIdx-1]
      const pack = foundry.utils.duplicate(this.packs!.find((p : AnyDict) => p.idx == soundData.pack))
      const sound = foundry.utils.duplicate(soundData)
      sound.sas = "?" + pack.sas

      const dragData = {
        moulinette: { 
          sound: sound, 
          pack: pack.packId,
          volume: MouApplication.getSettings(SETTINGS_SOUNDPAD_VOLUME),
          repeat: soundData.pack ? soundData.filename.toLowerCase().includes("loop") : true  
        },
        type: "SoundpadSound",
      };

      event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
    }
  }

  private async _onPlaySound(event : Event) {
    event.preventDefault();
    if(!event.currentTarget) return
    const soundIdx = $(event.currentTarget).data('idx')

    // download sound (unless user doesn't support TTA with appropriate tier)
    const userMayNotDownload = MouSoundpadUtils.noTTADownload()

    // sounds
    if(soundIdx && soundIdx > 0 && soundIdx <= this.sounds!.length) {
      const soundData = this.sounds![soundIdx-1]
      const pack = this.packs!.find((p : AnyDict) =>  p.idx == soundData.pack)
      let url = soundData.pack ? `${pack.path}/${soundData.filename}` : soundData.filename

      // add to playlist
      const moulinette = MouApplication.getMoulinetteModule()
      const folder = moulinette ? await moulinette.utils?.foundry.getOrCreateFolder("Playlist", "Moulinette") : null
      const playlistName = MouSoundPads.MOULINETTE_PLAYLIST.replace("#CREATOR#", MouSoundPads.CREATORS[this.creator!])
      let playlist = (game as Game).playlists!.find( pl => pl.name == playlistName )
      if(!playlist) {
        playlist = await Playlist.create({name: playlistName, mode: -1, folder: folder })
      }

      // download sound (unless user doesn't support TTA with appropriate tier)
      if(!userMayNotDownload) {
        if(moulinette) {
          const folderPath = moulinette.cloudclient.getDefaultDownloadFolder(pack.path)
          const downloadResult = await moulinette.utils.filemanager.downloadFile(`${soundData.filename}?${pack.sas}`, pack.path, folderPath)
          if(downloadResult) {
            url = downloadResult.path
          } else {
            this.logError(`Failed to download sound ${soundData.filename}!`)
          }
        } else {
          this.logError("Moulinette Media Search module not found! This should never happen.")
        }
      }

      let sound = playlist!.sounds.find( (s : AnyDict) => s.path.startsWith(url) ) as AnyDict
      // create sound if doesn't exist
      if(!sound) {
        sound = {}
        sound.name = MouSoundPads.cleanSoundName(soundData.filename.replaceAll("/", " | "))
        sound.volume = 1
        sound.repeat = soundData.pack ? soundData.filename.toLowerCase().includes("loop") : true
        sound.path = url + (userMayNotDownload ? "?" + pack.sas : "")
        sound = (await playlist!.createEmbeddedDocuments("PlaylistSound", [sound], {}))[0]
      }

      // adjust volume
      const volume = MouApplication.getSettings(SETTINGS_SOUNDPAD_VOLUME)

      // play sound (reset URL)
      playlist!.updateEmbeddedDocuments("PlaylistSound", [{_id: sound.id, path: sound.path, playing: !sound.playing, volume: volume}]);

      // show warning
      if(userMayNotDownload) {
        if(!MouApplication.getSettings(SETTINGS_SOUNDPAD_NO_TTA_WARNING)) {
          ui.notifications?.warn((game as Game).i18n.localize("MOUSND.tta_warning_nodownload"))
        }
        this.logWarn((game as Game).i18n.localize("MOUSND.tta_warning_nodownload"))
      }
    }
  }

  private _onSearch(expandCollapse = true) {
    //event.preventDefault();
    const text = this.html!.find("#search").val()?.toString().toLowerCase()
    const searchTerms = text?.split(" ")
    
    const hidden = MouApplication.getSettings(SETTINGS_SOUNDPAD_HIDDEN_FILES) as AnyDict
    
    // build list of filtered entries
    let filtered = [] as AnyDict[]
    const folderFilterd = "folders" in hidden ? hidden["folders"] : []
    this.packs!.forEach( (p : AnyDict) => { 
      if (p.packId.toString() in hidden) { 
        filtered = filtered.concat(hidden[p.packId.toString()]) 
      } 
    })

    // get list of all matching sounds
    const matches = this.sounds!.filter((s : AnyDict) => {
      // by default, hide all "hidden" entries
      if(!this.showAll && filtered.includes(this.sounds![s.idx-1].filename)) {
        return false;
      }
      // filter by category
      if(this.category && !(s.cat && s.cat.includes(this.category.toLowerCase()))) {
        return false;
      }
      if(searchTerms && searchTerms.length > 0) {
        for( const f of searchTerms ) {
          if( s.name.toLowerCase().indexOf(f) < 0 && (!s.tags || s.tags.toLowerCase().indexOf(f) < 0)) {
            return false;
          }
        }
      }
      return true
    })
    // get idx only (for fast filtering)
    const matchesIdx = matches.map((m : AnyDict) => m.idx)

    // show/hide sounds
    this.html!.find(".sound:not(.alt)").each(function(idx, sound) {
      idx; // unused
      const match = matchesIdx.includes($(sound).data('idx'))
      if(match) {
        $(sound).show()
      } else {
        $(sound).hide()
      }
    })

    // update folder counts
    let count = 0
    const keys = Object.keys(this.folders!).sort()
    for(const k of keys) {
      const sounds = this.folders![k].filter((s : AnyDict) => matchesIdx.includes(s.idx))
      const folder = this.html!.find(`[data-path='${k}']`)
      const folderHidden = folderFilterd.includes(k)
      if(sounds.length == 0 || (!this.showAll && folderHidden)) {
        folder.hide()
      } else {
        // replace the cound inside the ()
        const h2 = folder.find('h2');
        h2.html(h2.html().replace(/^(.*\()\d+(\).*)$/, `$1${sounds.length}$2`));
        folder.show()
        count += sounds.length
      }
    }

    // open/close all folders
    if(expandCollapse) {
      if(text && text.length > 0) {
        this.html?.find('.assets').show()
        this.html?.find(".folder h2 i").attr("class", "fas fa-folder-open")
      } else {
        this.html?.find('.assets').hide()
        this.html?.find(".folder h2 i").attr("class", "fas fa-folder")
      }
    }

    // show warning if no matches
    if(count == 0) {
      this.html?.find('.warning').show();
    } else {
      this.html?.find('.warning').hide();
    }
  }

  private _onPreviewSound(ev: JQuery.MouseEnterEvent): void {
    const parent = this
    this.previewTimeout = setTimeout(function() {
      const soundIdx = $(ev.currentTarget as HTMLElement).data('idx')
      if(soundIdx && soundIdx > 0 && soundIdx <= parent.sounds!.length) {
        const soundData = parent.sounds![soundIdx-1]
        const pack = parent.packs!.find((p : AnyDict) =>  p.idx == soundData.pack)
        const start = soundData.duration && soundData.duration > 20 ? soundData.duration / 2 : 0
        parent.previewSound.src = `${pack.path}/${soundData.filename}?${pack.sas}` + (start > 0 ? `#t=${start}` : "")
        parent.previewSound.play();
      }
    }, 1000);
  }

  private _onStopPreviewSound(): void {
    clearTimeout(this.previewTimeout);
    if(this.previewSound) {
      this.previewSound.pause()
      this.previewSound.src = ""
    }
  }

  /**
   * Creates an ambient sound resulting from a drag & drop
   */
  async createAmbientSound(data: AnyDict): Promise<boolean> {
    if(!canvas) return false;
    if(MouSoundpadUtils.noTTADownload()) {
      if(!MouApplication.getSettings(SETTINGS_SOUNDPAD_NO_TTA_WARNING)) {
        ui.notifications?.warn((game as Game).i18n.localize("MOUSND.tta_warning_nodownload"))
      }
      this.logWarn((game as Game).i18n.localize("MOUSND.tta_warning_nodownload"))
      return false;
    }
    else {
      console.log(data)
      const moulinette = MouApplication.getMoulinetteModule()
      const pack = this.packs!.find((p : AnyDict) => p.packId == data.moulinette.pack)
      console.log(pack)
      if(moulinette && pack) {
        const folderPath = moulinette.cloudclient.getDefaultDownloadFolder(pack.path)
        const downloadResult = await moulinette.utils.filemanager.downloadFile(`${data.moulinette.sound.filename}?${pack.sas}`, pack.path, folderPath)

        // Validate that the drop position is in-bounds and snap to grid
        if ( !canvas.dimensions!.rect.contains(data.x, data.y) ) return false;
        
        const soundData = {
          t: "l",
          x: data.x,
          y: data.y,
          path: downloadResult.path,
          radius: MouConfig.AMBIENT_SOUND_RADIUS,
          repeat: data.moulinette.repeat,
          volume: data.moulinette.volume
        }

        console.log(data, soundData)
        
        await canvas.scene!.createEmbeddedDocuments("AmbientSound", [soundData]);
        canvas.sounds!.activate();
        return true
      }
      return false
    }
  }
}
