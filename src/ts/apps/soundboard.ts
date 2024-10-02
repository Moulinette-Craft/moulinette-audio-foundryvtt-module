import { AnyDict } from "../types.js"
import MouApplication from "./application.js"
import MouConfig, { MODULE_ID, SETTINGS_SOUNDBOARD_ALLOW_PLAYERS } from "../constants.js"
import { MouSoundboardEdit } from "./soundboard-edit.js"
import { MouSoundboardUtils } from "../utils/soundboard-utils.js"
import MouMediaUtils from "../utils/media-utils.js"

export class MouSoundboard extends Application {

  static CELL_SIZE = 36 + 2 + 10 // border(1) & margin(5)

  private cols: number = 10
  private rows: number = 1
  private initialized: boolean = false
  private playing: AnyDict = {};

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-soundboard",
      classes: ["mou"],
      title: (game as Game).i18n.localize("MOUSND.soundboard"),
      template: `modules/${MODULE_ID}/templates/soundboard.hbs`,
      width: 100,
      height: "auto",
      minimizable: true,
      closeOnSubmit: false,
      submitOnClose: false
    });
  }
  
  override async getData() {
    if(!(game as Game).user?.isGM && !MouApplication.getSettings(SETTINGS_SOUNDBOARD_ALLOW_PLAYERS)) {
      throw new Error("You're not authorized to use the Moulinette Soundboard.");
    }

    return { 
      sounds: this.updateSounds()
    }
  }

  private updateSounds() : AnyDict[] {
    const settings = MouApplication.getUserSoundboard()
    this.cols = "cols" in settings ? settings["cols"] : 10
    this.rows = "rows" in settings ? settings["rows"] : 1

    const allSounds = []
    const sounds = []
    for(let r=0; r<this.rows; r++) {
      const row = []
      for(let c=0; c<this.cols; c++) {
        const i = 1 + (r*this.cols) + c
        if(Object.keys(settings).includes(`audio-${r}#${c}`)) {
          const audio = foundry.utils.duplicate(settings[`audio-${r}#${c}`])
          audio.id = `${r}#${c}`
          audio.idx = i
          row.push(audio)
          // check if sound is playing
          for(const path of audio.path) {
            const cleanPath = MouMediaUtils.getCleanURI(path)
            allSounds.push(cleanPath)
            if(cleanPath in this.playing) {
              audio.playing = this.playing[cleanPath]
            } else {
              this.playing[cleanPath] = false
            }
          }
          // button size is larger
          if(audio.size && audio.size > 1) {
            c += audio.size-1
          }
        } else {
          row.push({ id: `${r}#${c}`, idx: i })
        }
      }
      sounds.push(row)
    }

    // remove sounds that are not in the soundboard anymore
    for(const path in this.playing) {
      if(!allSounds.includes(path)) {
        delete this.playing[path]
      }
    }

    this.initialized = true
    return sounds;
  }

  /**
   * Implements listeners
   */
  override activateListeners(html: JQuery<HTMLElement>) {
    // reference to this instance
    const parent = this

    // resize windows to fit columns (16 is the padding (8))
    this.setPosition({"width": MouSoundboard.CELL_SIZE * this.cols + 16})

    // retrieve settings
    const settings = MouApplication.getUserSoundboard()

    html.find(".addRow").on("click", () => {
      this.rows = Math.min(this.rows+1, MouConfig.MAX_ROWS)
      settings.rows = this.rows
      MouApplication.setUserSoundboard(settings).then(() => parent.render(true))
    })
    html.find(".remRow").on("click", () => {
      this.rows = Math.max(this.rows-1, 1)
      settings.rows = this.rows
      MouApplication.setUserSoundboard(settings).then(() => parent.render(true))
    })
    html.find(".addCol").on("click", () => {
      this.cols = Math.min(this.cols+1, MouConfig.MAX_COLS)
      settings.cols = this.cols
      MouApplication.setUserSoundboard(settings).then(() => parent.render(true))
    })
    html.find(".remCol").on("click", () => {
      this.cols = Math.max(this.cols-1, 1)
      settings.cols = this.cols
      MouApplication.setUserSoundboard(settings).then(() => parent.render(true))
    })

    html.find(".export").on("click", () => {
      const filename = `moulinette-${((game as Game).world as AnyDict).title.slugify()}-soundboard.json`
      const data = MouApplication.getUserSoundboard()
      saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
    })

    html.find(".import").on("click", async function() {
      new Dialog({
        title: `Import Data: Moulinette Soundboard`,
        content: await renderTemplate("templates/apps/import-data.html", {
          hint1: (game as Game).i18n.format("DOCUMENT.ImportDataHint1", {document: "soundboard"}),
          hint2: (game as Game).i18n.format("DOCUMENT.ImportDataHint2", {name: "this soundboard"})
        }),
        buttons: {
          import: {
            icon: '<i class="fas fa-file-import"></i>',
            label: "Import",
            callback: html => {
              const form = (html as JQuery<HTMLElement>).find("form")[0];
              if ( !form.data.files.length ) return ui.notifications?.error("You did not upload a data file!");
              readTextFromFile(form.data.files[0]).then(json => {
                const data = JSON.parse(json)
                // check if from v1
                const keys = Object.keys(data)
                if(keys.length > 0 && keys[0].startsWith("fav")) {
                  const settings = MouApplication.getUserSoundboard()
                  const cols = settings.cols ? settings.cols : 10
                  const dataV2 = {} as AnyDict
                  for(const k of keys) {
                    // generate new key (compatible with v2)
                    const index = parseInt(k.substring(3))
                    const row = Math.floor(index / cols)
                    const col = index % cols
                    const newKey = `audio-${row}#${col}`
                    // convert paths to array
                    const sound = data[k]
                    if(!Array.isArray(sound.path)) {
                      sound.path = [sound.path]
                    }
                    // build new settings
                    dataV2[newKey] = sound
                  }
                  MouApplication.setUserSoundboard(dataV2).then(() => parent.render(true))
                } else {
                  MouApplication.setUserSoundboard(JSON.parse(json)).then(() => parent.render(true))
                }
              });
            }
          },
          no: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: (game as Game).i18n.localize("MOUSND.cancel")
          }
        },
        default: (game as Game).i18n.localize("MOUSND.import")
      }, {
        width: 400
      }).render(true);
    })

    html.find(".delete").on("click", () => {
      return Dialog.confirm({
        title: `${(game as Game).i18n.localize("MOUSND.delete_tooltip")}`,
        content: `${(game as Game).i18n.localize("MOUSND.delete_warning")}`,
        yes: () => {
          MouApplication.setUserSoundboard({}).then(() => parent.render(true))
        }
      });
    })


    html.find('.snd.used').on("click", ev => this._playSound(ev))
    html.find('.snd.unused').on("click", ev => this._editSound(ev, true))
    html.find('.snd').on("mousedown", ev => this._editSound(ev))

    html.find('.snd.used').on('dragstart',function (event) {
      const slot = event.currentTarget.dataset.slot as string
      event.originalEvent?.dataTransfer?.setData("text/plain", slot)
    })

    html.find('.snd').on('drop', async function (event) {
      event.preventDefault();

      const fromSlot = event.originalEvent?.dataTransfer?.getData("text/plain") as string
      const toSlot = event.currentTarget.dataset.slot

      let data = null
      try {
        data = JSON.parse(fromSlot);
      } catch (e) {}

      // drag & drop from slot to slot
      if(!data) {
        let settings = MouApplication.getUserSoundboard()
        if(fromSlot && toSlot && fromSlot != toSlot && Object.keys(settings).includes("audio-" + fromSlot)) {
          const fromAudio = settings["audio-" + fromSlot]
          const toAudio = Object.keys(settings).includes("audio-" + toSlot) ? settings["audio-" + toSlot] : null
          let overwrite = null
          // target not defined => move
          if(!toAudio) {
            overwrite = true
          }
          // target defined => prompt for desired behaviour
          else {
            overwrite = await Dialog.confirm({
              title: (game as Game).i18n.localize("MOUSND.move_audio"),
              content: (game as Game).i18n.localize("MOUSND.move_audio_content"),
            })
            if(overwrite == null) return;
          }
          settings["audio-" + toSlot] = fromAudio
          if(overwrite) {
            delete settings["audio-" + fromSlot]
          } else {
            settings["audio-" + fromSlot] = toAudio
          }

          await MouApplication.setUserSoundboard(settings)
          parent.render()
        }
      }
      // drag & drop to slot
      else {
        console.log(data)
        if(data && data.source == "mtte" && data.sound && data.pack) {
          const settings = MouApplication.getUserSoundboard()
          if(`audio-${toSlot}` in settings) {
            return ui.notifications?.error((game as Game).i18n.localize("MOUSND.slot_exists")); 
          }
          /*
          const sound = data.sound
          await MoulinetteSoundsUtil.downloadAsset(data)
          const name = game.moulinette.applications.Moulinette.prettyText(sound.filename.split("/").pop()).replace(".ogg","").replace(".mp3","").replace(".wav","").replace(".webm","").replace(".m4a","")
          settings[`audio-${toSlot}`] = { 
            name: name,
            path: [data.path],
            volume: AudioHelper.inputToVolume(data.volume) 
          }
          await MouApplication.setUserSoundboard(settings)
          */
          parent.render()
        }
      }
    })

    html.find('.snd').on('dragover',function (event) {
      event.preventDefault();
    })

    this.bringToTop()
  }

  async _editSound(event: any, force = false) {
    // right click only
    if(force || event.which == 3) {
      const slot = event.currentTarget.dataset.slot;
      
      let settings = MouApplication.getUserSoundboard()
      
      const row = Number(slot.split('#')[0])
      const col = Number(slot.split('#')[1])

      let data = {} as AnyDict
      if(Object.keys(settings).includes("audio-" + slot)) {
        data = settings["audio-" + slot]
      } else {
        data.path = []
      }
      data.idx = row * this.cols + col + 1
      const moulinette = new MouSoundboardEdit(data, slot, this)
      moulinette.options.title = (game as Game).i18n.localize("MOUSND.edit_slot")
      moulinette.render(true)
    }
  }

  async _playSound(event: any) {
    const slot = (event.currentTarget as AnyDict).dataset.slot
    if(slot) {
      let settings = MouApplication.getUserSoundboard()
      if(Object.keys(settings).includes("audio-" + slot)) {
        MouSoundboardUtils.playSound((game as Game).user?.name || "??", settings["audio-" + slot])
      } else {
        ui.notifications?.warn((game as Game).i18n.localize("MOUSND.slot_notassigned"));
      }
    }
  }

  async updatePlaySound(path: string, playing: boolean): Promise<void> {
    if(!this.initialized) this.updateSounds() 
    const cleanPath = MouMediaUtils.getCleanURI(path)
    if(!(cleanPath in this.playing)) return
    this.playing[cleanPath] = playing
    this.render()
  }

}
