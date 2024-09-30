// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/style.scss";
import MouApplication from "./apps/application";
import { MouSoundboard } from "./apps/soundboard";
import MouConfig, { MODULE_ID, SETTINGS_SOUNDBOARD_ALLOW_PLAYERS, SETTINGS_SOUNDBOARDS } from "./constants";
import { AnyDict, MouModule } from "./types";
import { SoundboardUtils } from "./utils/soundboard-utils";

let module: MouModule;

Hooks.once("init", () => {
  MouApplication.logInfo("MouSoundboards", `Initializing ${MODULE_ID}`);

  module = MouApplication.getModule()
  module.soundboard = new MouSoundboard();
  module.debug = true;
  
  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDBOARD_ALLOW_PLAYERS, {
    name: (game as Game).i18n.localize("MOUSND.config_players"), 
    hint: (game as Game).i18n.localize("MOUSND.config_players_hint"), 
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  (game as Game).settings.register(MODULE_ID, SETTINGS_SOUNDBOARDS, { scope: "client", config: false, type: Object, default: {} as AnyDict });
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
          icon: "fa-solid fa-keyboard", 
          title: (game as Game).i18n.localize("MOUSND.soundboard"),
          button: true, 
          onClick: () => { module.soundboard.render(true) } 
        })
    }

    (game as any).socket.on(`module.${MODULE_ID}`, async function(data: AnyDict) {
      if(!data.type) return;
      if(data.type == "playSound") {
        if(!data.user || !data.audio) return;
        MouApplication.logInfo("MouSoundboards", `Playing sound ${data.audio.path} from ${data.user}`)
        SoundboardUtils.playSound(data.user, data.audio)
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
  SoundboardUtils.updatePlayingSound(playlist, updateData)
});