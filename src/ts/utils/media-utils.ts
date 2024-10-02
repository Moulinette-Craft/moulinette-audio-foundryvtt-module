/**
 * A utility class for working with media files.
 * 
 * @remarks
 * **Attention:** This class contains duplicated methods from: https://github.com/SvenWerlen/moulinette-foundryvtt-module/blob/main/src/ts/utils/media-utils.ts
 */
export default class MouMediaUtils {

  /**
   * ALWAYS COPY IT FROM moulinette-foundryvtt-module
   */
  static getCleanURI(uri: string) {
    try {
      return decodeURIComponent(uri);
    } catch (e) {
      return uri;
    }
  }

  /**
   * ALWAYS COPY IT FROM moulinette-foundryvtt-module
   */
  static encodeURL(url: string) {
    if(url.startsWith("https")) return url
    return url.split('/').map(encodeURIComponent).join('/')
  }

  /**
   * ALWAYS COPY IT FROM moulinette-foundryvtt-module
   */
  static getBasePath(filepath: string) {
    return filepath.replace(/\.[^/.]+$/, "")
  }

  /**
   * ALWAYS COPY IT FROM moulinette-foundryvtt-module
   */
  static prettyMediaName(filepath: string) {
    const cleanPath = MouMediaUtils.getCleanURI(filepath)
    const basepath = MouMediaUtils.getBasePath(cleanPath)
    let name = basepath.split("/").pop()                  // keep filename only (not entire path)
    name = name?.replace(/[-_]/g, " ")                    // replace _ and - by spaces
    name = name?.split(' ')                               // capitalize the first letter of each word
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    return name ? name : cleanPath
  }

  /**
   * ALWAYS COPY IT FROM moulinette-foundryvtt-module
   */
  static prettyDuration(seconds: number) {
    seconds = Math.round(seconds)
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    // Format MM:SS for duration less than 1 hour
    if (hours === 0) {
      return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    } else {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }
  }
}