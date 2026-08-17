import MouConfig from "./constants";
import { MouSoundboard } from "./apps/soundboard";
import { MouSoundPads } from "./apps/soundpads";

/**
 * NOTE: we intentionally do NOT extend the types package's internal Module/ModuleData
 * shape here. That internal path moves around between releases of fvtt-types
 * (it's not part of the public API surface), so pinning to it makes every
 * types-package upgrade a potential build break. `game.modules.get(id)` is cast
 * to this interface at the call site instead (see MouApplication.getModule()).
 */
export interface MouModule {
  id: string;
  active: boolean;
  debug: boolean;
  soundboard: MouSoundboard
  soundpads: MouSoundPads
  
  // configurations that can be overridden
  configs: typeof MouConfig;

  [key: string]: any;
}

export interface AnyDict {
  [key: string]: any;
}