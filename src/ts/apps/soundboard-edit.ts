import { MODULE_ID } from "../constants"
import { AnyDict } from "../types"
import MouMediaUtils from "../utils/media-utils"
import MouApplication from "./application"
import { MouSoundboard } from "./soundboard"

export class MouSoundboardEdit extends Application {
    
  private data: AnyDict
  private slot: string
  private parent: MouSoundboard
  private html?: JQuery<HTMLElement>
  private currentlyPlaying: HTMLAudioElement | null

  constructor(data: AnyDict, slot: string, parent: MouSoundboard) {
    super()
    this.data = data
    this.slot = slot
    this.parent = parent
    this.currentlyPlaying = null

    if(!this.data.volume) {
      this.data.volume = 1.0
    }
  }
  
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-soundboard-edit",
      classes: ["mou"],
      title: (game as Game).i18n.localize("MOUSND.edit_slot"),
      template: `modules/${MODULE_ID}/templates/soundboard-edit.hbs`,
      width: 500,
      height: "auto",
      closeOnSubmit: true,
      submitOnClose: false,
    });
  }
  
  override getData() {
    const audio = [] as AnyDict
    const settings = MouApplication.getUserSoundboard()
    this.data.path.forEach((p : string) => audio.push({'name' : MouMediaUtils.prettyMediaName(p), 'path': p}))
    return {
      data: this.data, 
      audio: audio,
      canBrowse: (game as Game).permissions?.FILES_BROWSE.includes((game as any).user.role),
      canUpload: (game as Game).permissions?.FILES_UPLOAD.includes((game as any).user.role),
      multiple: Array.isArray(this.data.path), 
      volume: (foundry as AnyDict).audio.AudioHelper.volumeToInput(this.data.volume),
      exists: Object.keys(settings).includes("audio-" + this.slot),
      size1: !this.data.size || this.data.size == 1,
      size2: this.data.size == 2,
      size3: this.data.size == 3
    }
  }
  
  async _onClick(event: Event) {
    event.preventDefault();
    const button = event.currentTarget as HTMLElement;
    if(!button) return;
    if(button.classList.contains("cancel")) {
      this.close()
    }
    else if(button.classList.contains("browse")) {
      const icon = this.html?.find("input.icon2").val() as string
      new FilePicker({callback: this._onPathChosen.bind(this), current: icon ? icon : "moulinette/images/", type: "image"}).render(true);
    }
    else if(button.classList.contains("browseSound")) {
      new FilePicker({callback: this._onAudioChosen.bind(this), type: "audio"}).render(true);
    }
    else if(button.classList.contains("searchMoulinetteImage")) {
      const moulinette = MouApplication.getMoulinetteModule()
      if(moulinette && moulinette.active) {
        const browser = new (moulinette.utils.browser)({}, "Image", this._onPathChosen.bind(this))
        browser.render(true)
      } else {
        return ui.notifications?.error((game as Game).i18n.localize("MOUSND.error_moulinette_required"))
      }
    }
    else if(button.classList.contains("searchMoulinetteIcon")) {
      const moulinette = MouApplication.getMoulinetteModule()
      if(moulinette && moulinette.active) {
        const browser = new (moulinette.utils.browser)({}, "Icon", this._onIconChosen.bind(this))
        browser.render(true)
      } else {
        return ui.notifications?.error((game as Game).i18n.localize("MOUSND.error_moulinette_required"))
      }
    }
    else if(button.classList.contains("searchMoulinetteSound")) {
      const moulinette = MouApplication.getMoulinetteModule()
      if(moulinette && moulinette.active) {
        const browser = new (moulinette.utils.browser)({}, "Audio", this._onAudioChosen.bind(this))
        browser.render(true)
      } else {
        return ui.notifications?.error((game as Game).i18n.localize("MOUSND.error_moulinette_required"))
      }
    }
    else if(button.classList.contains("delete")) {
      // prompt confirmation
      let settings = MouApplication.getUserSoundboard()
      const slot = `#${this.data.idx}`
      const dialogDecision = await Dialog.confirm({
        title: (game as Game).i18n.localize("MOUSND.delete_slot"),
        content: (game as Game).i18n.format("MOUSND.delete_slot_content", { from: slot }),
      })
      if(!dialogDecision) return;

      delete settings["audio-" + this.slot]
      await MouApplication.getUserSoundboard()
      this.close()
      if(this.parent) {
        this.parent.render()
      }
    }
    else if(button.classList.contains("save")) {
      const settings = MouApplication.getUserSoundboard()
      if(this.data.path.length == 0) {
        return ui.notifications?.error((game as Game).i18n.localize("MOUSND.error_soundboard_noaudio"));
      }

      // remove icon size for icon button
      if(this.data.icon && this.data.size) {
        delete this.data.size
      }

      let audio = foundry.utils.duplicate(this.data)
      delete audio["id"]
      delete audio["idx"]
      settings["audio-" + this.slot] = audio
      await MouApplication.setUserSoundboard(settings)
      this.close()
      if(this.parent) {
        this.parent.render()
      }
    }
  }
  
  /**
   * User selected a path (as image icon)
   */
  _onPathChosen(path: string) {
    this.html?.find("input.icon2").val(path)
    this.html?.find(".icon").val("")
    this.data.icon = path
    this.data.faIcon = false
    this._updateAudioButtonLayout()
  }

  _onIconChosen(iconStr: string) {
    this.html?.find("input.icon").val(iconStr)
    this.html?.find(".icon2").val("")
    this.data.icon = iconStr
    this.data.faIcon = true
    this._updateAudioButtonLayout()
  }

  _onAudioChosen(path: string) {
    if(path) {
      this.data.path.push(path)
      this.render()
    }
  }
  
  async _onTogglePreview() {
    let sound = null
    
    if(this.data.path == 0) return;

    // pause sound if playing
    if(this.currentlyPlaying && !this.currentlyPlaying.paused) {
      this.currentlyPlaying.pause()
      this.currentlyPlaying.currentTime = 0;
      this.currentlyPlaying = null
      return
    }
    let idx = 0
    if(this.data.path.length > 1) {
      idx = Math.floor((Math.random() * this.data.path.length));
    }
    sound = document.getElementById("previewSound" + idx) as HTMLAudioElement
    this.currentlyPlaying = sound
    
    if(sound.paused) {
      sound.play();
    }
    else {
      sound.pause();
      sound.currentTime = 0;
    }
  }
  
  async _onSoundVolume(event: JQuery.ChangeEvent) {
    event.preventDefault();
    const slider = event.currentTarget as HTMLInputElement;
    const volume = (foundry as AnyDict).audio.AudioHelper.inputToVolume(slider.value)
    this.html?.find("audio").prop("volume", volume);
    this.data.volume = volume
  }

  /**
   * Update Button Layout according to the current settings
   */
  _updateAudioButtonLayout() {
    const button = this.html?.find(".sounds .snd") as JQuery<HTMLElement>
    // reset size
    button.removeClass("size1")
    button.removeClass("size2")
    button.removeClass("size3")
    // no sound selected
    if(this.data.path.length == 0) {
      button.removeClass("used")
      button.addClass("unused")
      button.text(this.data.idx)
    }
    else {
      button.addClass("used")
      button.removeClass("unused")
      if(this.data.icon) {
        if(this.data.faIcon) {
          button.html(`<i class="${this.data.icon}" title="${this.data.name}"></i>`)
        } else {
          button.html(`<img class="icon" title="${this.data.name}" src="${this.data.icon}"/>`)
        }
      } else {
        // size only for text button
        if(this.data.size >= 2) {
          button.addClass("size" + this.data.size)
        }
        if(this.data.name && this.data.name.length > 0) {
          button.text(this.data.name)
        } else {
          button.text(this.data.idx)
        }
      } 
    }
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    const parent = this
    this.html = html

    html.find("button").on("click", this._onClick.bind(this))
    html.find(".snd").on("click", this._onTogglePreview.bind(this))
    html.find('.sound-volume').on("change", (event: JQuery.ChangeEvent) => this._onSoundVolume(event));
    
    html.find('.audiofile').on("click", ev => {
      ev.preventDefault()
      const idx = $(ev.currentTarget).data("idx")
      if(idx >= 0 && idx < this.data.path.length) {
        parent.data.path.splice(idx, 1)
        parent.render(true)
      }  
    })
    html.find("audio").prop("volume", (foundry as AnyDict).audio.AudioHelper.volumeToInput(this.data.volume))

    html.find("input.shortText").on('input',function(e){
      const txt = $(e.currentTarget).val()
      parent.data.name = txt
      parent._updateAudioButtonLayout()
    });

    html.find("#IconInputEdit").on("change", (e) => {
      html.find(".icon2").val("")
      const txt = $(e.currentTarget).val() as string
      parent.data.icon = txt
      parent.data.faIcon = txt.length > 0
      parent._updateAudioButtonLayout()
    })

    html.find(".icon2").on("change", (e) => {
      html.find(".icon").val("")
      const txt = $(e.currentTarget).val()
      parent.data.icon = txt
      parent.data.faIcon = false
      parent._updateAudioButtonLayout()
    })

    html.find(".size1").on("click", () => {
      parent.data.size = 1
      parent._updateAudioButtonLayout()
      html.find(".size1").addClass("selected")
      html.find(".size2").removeClass("selected")
      html.find(".size3").removeClass("selected")
    })
    html.find(".size2").on("click", () => {
      if(this.data.icon) {
        return ui.notifications?.warn((game as Game).i18n.localize("MOUSND.error_soundboard_iconsize"));
      }
      html.find(".size1").removeClass("selected")
      html.find(".size2").addClass("selected")
      html.find(".size3").removeClass("selected")
      parent.data.size = 2
      parent._updateAudioButtonLayout()
    })
    html.find(".size3").on("click", () => {
      if(this.data.icon) {
        return ui.notifications?.warn((game as Game).i18n.localize("MOUSND.error_soundboard_iconsize"));
      }
      html.find(".size1").removeClass("selected")
      html.find(".size2").removeClass("selected")
      html.find(".size3").addClass("selected")
      parent.data.size = 3
      parent._updateAudioButtonLayout()
    })
  }
  
}
