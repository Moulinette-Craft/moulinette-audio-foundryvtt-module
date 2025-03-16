import { AnyDict } from "../types.js"
import MouApplication from "./application.js"
import MouConfig, { MODULE_ID, SETTINGS_SOUNDBOARD_ALLOW_PLAYERS, SETTINGS_SOUNDBOARDS, SLOT_SIZES } from "../constants.js"
import { MouSoundboardEdit } from "./soundboard-edit.js"
import { MouSoundboardUtils } from "../utils/soundboard-utils.js"
import MouMediaUtils from "../utils/media-utils.js"

export class MouSoundboard extends Application {

  static CELL_SIZE = 36 + 2 + 10 // border(1x2) & margin(5x2)

  private cols: number = 10
  private rows: number = 1
  private initialized: boolean = false
  private playing: AnyDict = {};
  private showList: boolean = false

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

    // build playing sounds
    this.playing = {}
    for(const sound of Array.from((game as Game).audio.playing.values())) {
      const cleanPath = MouMediaUtils.getCleanURI(sound.src)
      this.playing[cleanPath] = true
    }

    return { 
      tiny: this.cols <= 4,
      hideUnused: MouApplication.getUserSoundboard().hideUnused,
      sounds: this.updateSounds(),
      boards: this.showList ? await MouApplication.getSounboardList() : null,
    }
  }

  private updateSounds() : AnyDict[] {
    const soundboard = MouApplication.getUserSoundboard()
    this.cols = "cols" in soundboard ? soundboard["cols"] : MouConfig.DEFAULT_COLS
    this.rows = "rows" in soundboard ? soundboard["rows"] : MouConfig.DEFAULT_ROWS

    const allSounds = []
    const sounds = []
    for(let r=0; r<this.rows; r++) {
      const row = []
      for(let c=0; c<this.cols; c++) {
        const i = 1 + (r*this.cols) + c
        if(Object.keys(soundboard).includes(`audio-${r}#${c}`)) {
          const audio = foundry.utils.duplicate(soundboard[`audio-${r}#${c}`])
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
            const slotSize = SLOT_SIZES.find((s) => s.class == audio.size)
            if(slotSize) {
              c += slotSize.merged-1
            }
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
    const boardWidth = MouSoundboard.CELL_SIZE * this.cols
    this.setPosition({"width": boardWidth + 16 + (this.showList ? 150 : 0)})
    html.find(".sounds").css("max-width", `${boardWidth}px`)

    // retrieve settings
    const currentUserSoundboard = MouApplication.getUserSoundboard()

    html.find(".addRow").on("click", () => {
      this.rows = Math.min(this.rows+1, MouConfig.MAX_ROWS)
      currentUserSoundboard.rows = this.rows
      MouApplication.setUserSoundboard(currentUserSoundboard).then(() => parent.render(true))
    })
    html.find(".remRow").on("click", () => {
      this.rows = Math.max(this.rows-1, 1)
      currentUserSoundboard.rows = this.rows
      MouApplication.setUserSoundboard(currentUserSoundboard).then(() => parent.render(true))
    })
    html.find(".addCol").on("click", () => {
      this.cols = Math.min(this.cols+1, MouConfig.MAX_COLS)
      currentUserSoundboard.cols = this.cols
      MouApplication.setUserSoundboard(currentUserSoundboard).then(() => parent.render(true))
    })
    html.find(".remCol").on("click", () => {
      this.cols = Math.max(this.cols-1, 1)
      currentUserSoundboard.cols = this.cols
      MouApplication.setUserSoundboard(currentUserSoundboard).then(() => parent.render(true))
    })

    html.find(".export").on("click", () => {
      const filename = `moulinette-${((game as Game).world as AnyDict).title.slugify()}-soundboard.json`
      const data = MouApplication.getUserSoundboard()
      saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);
    })

    html.find(".exportAll").on("click", () => {
      const filename = `moulinette-${((game as Game).world as AnyDict).title.slugify()}-all-soundboard.json`
      const data = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
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
                  const cols = settings.cols ? settings.cols : MouConfig.DEFAULT_COLS
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
        default: "import"
      }, {
        width: 400
      }).render(true);
    })

    html.find(".importAll").on("click", async function() {
      new Dialog({
        title: `Import Data: Moulinette Soundboard Collection`,
        content: await renderTemplate("templates/apps/import-data.html", {
          hint1: (game as Game).i18n.format("DOCUMENT.ImportDataHint1", {document: "soundboard collection"}),
          hint2: (game as Game).i18n.format("DOCUMENT.ImportDataHint2", {name: "this soundboard collection"})
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
                MouApplication.setSettings(SETTINGS_SOUNDBOARDS, data).then(() => parent.render(true))
              });
            }
          },
          no: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: (game as Game).i18n.localize("MOUSND.cancel")
          }
        },
        default: "import"
      }, {
        width: 400
      }).render(true);
    })

    html.find(".delete").on("click", (event: Event) => {
      const boardIdx = $(event.currentTarget as HTMLLinkElement).closest("li").data("idx")
      const userSoundboard = MouApplication.getUserSoundboard(boardIdx)

      return Dialog.confirm({
        title: `${(game as Game).i18n.localize("MOUSND.delete_tooltip")}`,
        content: `${(game as Game).i18n.format("MOUSND.delete_warning", { name: userSoundboard.name})}`,
        yes: () => {
          MouApplication.deleteSoundboard(boardIdx).then(() => {
            parent.render(true)
          })
        }
      });
    })

    html.find(".addBoard").on("click", async () => {
      new Dialog({
        title: (game as Game).i18n.localize("MOUSND.add_board_tooltip"),
        content: await renderTemplate(`modules/${MODULE_ID}/templates/soundboard-name.hbs`, {
          name: ""
        }),
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-plus-square"></i>',
            label: `${(game as Game).i18n.localize("MOUSND.create")}`,
            callback: html => {
              const name = (html as JQuery<HTMLElement>).find("input").val() as string
              if(name.length < 3) {
                throw new Error("MouSoundboards | Soundboard name must be at least 3 characters long.")
              }
              MouApplication.createSoundboard(name).then(() => {
                parent.render(true)
              })
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: (game as Game).i18n.localize("MOUSND.cancel")
          }
        },
        default: "create"
      }, {
        width: 200
      }).render(true);
    })

    html.find(".edit").on("click", async (event: Event) => {
      const boardIdx = $(event.currentTarget as HTMLLinkElement).closest("li").data("idx")
      const userSoundboard = MouApplication.getUserSoundboard(boardIdx)
              
      new Dialog({
        title: (game as Game).i18n.localize("MOUSND.edit_tooltip"),
        content: await renderTemplate(`modules/${MODULE_ID}/templates/soundboard-name.hbs`, {
          name: userSoundboard.name
        }),
        buttons: {
          ok: {
            icon: '<i class="fa-solid fa-pen-to-square"></i>',
            label: `${(game as Game).i18n.localize("MOUSND.rename")}`,
            callback: html => {
              const name = (html as JQuery<HTMLElement>).find("input").val() as string
              if(name.length < 3) {
                throw new Error("MouSoundboards | Soundboard name must be at least 3 characters long.")
              }
              userSoundboard.name = name
              MouApplication.setUserSoundboard(userSoundboard, boardIdx).then(() => parent.render(true))
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: (game as Game).i18n.localize("MOUSND.cancel")
          }
        },
        default: "ok"
      }, {
        width: 200
      }).render(true);
    })

    html.find(".sndBoard").on("click", async (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const boardIdx = $(event.currentTarget as HTMLLinkElement).closest("li").data("idx")
      MouApplication.setCurrentSoundboard(boardIdx).then(() => parent.render(true))
    })

    html.find(".list").on("click", () => {
      this.showList = !this.showList
      parent.render()
    });

    html.find(".toggle").on("click", () => {
      currentUserSoundboard.hideUnused = !currentUserSoundboard.hideUnused
      MouApplication.setUserSoundboard(currentUserSoundboard).then(() => parent.render(true))
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
            // holding key => copy/duplicate
            if(!event.ctrlKey) {
              delete settings["audio-" + fromSlot]
            }
          } else {
            settings["audio-" + fromSlot] = toAudio
          }

          await MouApplication.setUserSoundboard(settings)
          parent.render()
        }
      }
      // drag & drop to slot
      else {
        const soundboard = MouApplication.getUserSoundboard()
        if(`audio-${toSlot}` in soundboard) {
          return ui.notifications?.error((game as Game).i18n.localize("MOUSND.slot_exists")); 
        }
        console.log(data)
        if("moulinette" in data) {
          ui.notifications?.warn((game as Game).i18n.localize("MOUSND.warn_import_before_drop"));
        } else if(data.type == "PlaylistSound") {
          const sound = await fromUuid(data.uuid) as AnyDict
          if(sound) {
            soundboard[`audio-${toSlot}`] = {
              name: sound.name,
              channel: sound.channel,
              volume: sound.volume,
              fade: sound.fade,
              repeat: sound.repeat,
              path: [sound.path]
            }
            await MouApplication.setUserSoundboard(soundboard).then(() => parent.render())
          }
        } else if(data.type == "Playlist") {
          const playlist = await fromUuid(data.uuid) as AnyDict
          if(playlist && playlist.sounds && playlist.sounds.size > 0) {
            const firstSound = playlist.sounds.contents[0]
            console.log(firstSound)
            soundboard[`audio-${toSlot}`] = {
              name: playlist.name,
              channel: firstSound.channel,
              volume: firstSound.volume,
              fade: firstSound.fade,
              repeat: firstSound.repeat,
              path: playlist.sounds.contents.filter((snd : AnyDict)=> snd.path).map((snd: AnyDict) => snd.path)
            }
            await MouApplication.setUserSoundboard(soundboard).then(() => parent.render())
          }
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
    // middle click
    else if(event.which == 2) {
      const slot = event.currentTarget.dataset.slot;
      let soundboard = MouApplication.getUserSoundboard()
      if(Object.keys(soundboard).includes("audio-" + slot)) {
        const dialogDecision = await Dialog.confirm({
          title: (game as Game).i18n.localize("MOUSND.delete_slot"),
          content: (game as Game).i18n.format("MOUSND.delete_slot_content", { from: slot }),
        })
        if(!dialogDecision) return;
        delete soundboard["audio-" + slot]
        MouApplication.setUserSoundboard(soundboard).then(() => this.render())
      }
    }
  }

  async _playSound(event: any) {
    const slot = (event.currentTarget as AnyDict).dataset.slot
    if(slot) {
      let settings = MouApplication.getUserSoundboard()
      if(Object.keys(settings).includes("audio-" + slot)) {
        const playlistName = `${(game as Game).i18n.localize("MOUSND.soundboard_name")}: ${(game as Game).user?.name || "??"}`
        const soundUri = settings["audio-" + slot]
        MouSoundboardUtils.playSound(soundUri, playlistName)
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
    setTimeout(() => this.render(), 200)
  }

  showSoundboardByName(name: string) {
    const soundboards = MouApplication.getSettings(SETTINGS_SOUNDBOARDS) as AnyDict
    for(let idx = 0; idx < soundboards.boards.length; idx++) {
      if(soundboards.boards[idx].name == name) {
        MouApplication.setCurrentSoundboard(idx).then(() => this.render(true))
        return
      }
    }
  }
}
