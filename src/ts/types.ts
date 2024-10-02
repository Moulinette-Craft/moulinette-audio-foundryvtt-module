import { ModuleData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/packages.mjs";
import MouConfig from "./constants";
import { MouSoundboard } from "./apps/soundboard";
import { MouSoundPads } from "./apps/soundpads";

export interface MouModule extends Game.ModuleData<ModuleData> {
  debug: boolean;
  soundboard: MouSoundboard
  soundpads: MouSoundPads
  
  // configurations that can be overridden
  configs: MouConfig;
}

export interface AnyDict {
  [key: string]: any;
}