// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/style.scss";
import MouApplication from "./apps/application";
import { MouSoundboard } from "./apps/soundboard";
import { MouSoundPads } from "./apps/soundpads";
import MouConfig, { MODULE_ID, SETTINGS_SOUNDBOARD_ALLOW_PLAYERS, SETTINGS_SOUNDBOARDS, SETTINGS_SOUNDPAD_CREATOR, SETTINGS_SOUNDPAD_HIDDEN_FILES, SETTINGS_SOUNDPAD_HIDE_CONTROLS, SETTINGS_SOUNDPAD_NO_TTA_WARNING, SETTINGS_SOUNDPAD_VOLUME } from "./constants";
import { AnyDict, MouModule } from "./types";
import { MouSoundboardUtils } from "./utils/soundboard-utils";

let module: MouModule;

Hooks.once("init", () => {
  MouApplication.logInfo("MouSoundboards", `Initializing ${MODULE_ID}`);

  module = MouApplication.getModule()
  module.soundboard = new MouSoundboard();
  module.soundpads = new MouSoundPads();
  module.debug = true;
  
  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDBOARD_ALLOW_PLAYERS, {
    name: (game as Game).i18n.localize("MOUSND.config_players"), 
    hint: (game as Game).i18n.localize("MOUSND.config_players_hint"), 
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDPAD_HIDE_CONTROLS, {
    name: (game as Game).i18n.localize("MOUSND.config_hide_ui"),
    hint: (game as Game).i18n.localize("MOUSND.config_hide_ui_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDPAD_NO_TTA_WARNING, {
    name: (game as Game).i18n.localize("MOUSND.config_hide_tta_warning"),
    hint: (game as Game).i18n.localize("MOUSND.config_hide_tta_warning_hint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDBOARDS, { scope: "client", config: false, type: Object, default: {} as AnyDict });
  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDPAD_VOLUME, { scope: "world", config: false, default: 1, type: Number });
  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDPAD_HIDDEN_FILES, { scope: "world", config: false, type: Object, default: {} });
  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDPAD_CREATOR, { scope: "world", config: false, type: String, default: null });
});

Hooks.once("ready", () => {
  // make config available
  module.configs = MouConfig

  if ((game as Game).user?.isGM) {
    // insert
    const moulinette = MouApplication.getMoulinetteModule()
    if(moulinette && moulinette.tools) {
      moulinette.tools.push({ 
          name: "soundboard", 
          icon: "mou-icon mou-soundboard", 
          title: (game as Game).i18n.localize("MOUSND.soundboard"),
          button: true, 
          onClick: () => { module.soundboard.render(true) } 
        })

      moulinette.tools.push({ 
          name: "soundpads", 
          icon: "mou-icon mou-soundpad", 
          title: (game as Game).i18n.localize("MOUSND.soundpads"),
          button: true, 
          onClick: () => { module.soundpads.render(true) } 
        })
    }

    (game as any).socket.on(`module.${MODULE_ID}`, async function(data: AnyDict) {
      if(!data.type) return;
      if(data.type == "playSound") {
        if(!data.user || !data.audio) return;
        MouApplication.logInfo("MouSoundboards", `Playing sound ${data.audio.path} from ${data.user}`)
        MouSoundboardUtils.playSound(data.audio, `${(game as Game).i18n.localize("MOUSND.soundboard_name")}: ${data.user}`)
      }
    })
  }
});

Hooks.on("renderSidebarTab", async (app : any, html : JQuery<HTMLElement>) => {
  
  // only available for GM and players if enabled
  if(!(game as Game).user?.isGM && !MouApplication.getSettings(SETTINGS_SOUNDBOARD_ALLOW_PLAYERS)) {
    return
  }
  
  if (app.id == 'playlists') {
    const btn = await renderTemplate(`modules/${MODULE_ID}/templates/playlist-button.hbs`, {})
    html.find(".directory-footer").append(btn);
    html.find("#mou-soundboard-open").on("click", () => {
      module.soundboard.render(true)
    });
  }
});

Hooks.on("preUpdatePlaylist", (playlist : Playlist, updateData: any) => {
  MouSoundboardUtils.updatePlayingSound(playlist, updateData)
});

/**
 * Manage canvas drop
 */
Hooks.on('dropCanvasData', (canvas, data) => {
  canvas; // unused
  console.log("dropCanvasData", data)
  if("moulinette" in data) {
    // Drag & drop a sound
    if(data.moulinette.sound) {
      module.soundpads.createAmbientSound(data)
    }
  }
});