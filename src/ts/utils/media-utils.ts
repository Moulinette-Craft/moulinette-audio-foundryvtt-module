/**
 * A utility class for working with media files.
 * 
 * @remarks
 * **Attention:** This class contains duplicated methods from: https://github.com/SvenWerlen/moulinette-foundryvtt-module/blob/main/src/ts/utils/media-utils.ts
 */
export default class MouMediaUtils {

  /**
   * Decodes a given URI string. If the decoding process fails, it returns the original URI.
   *
   * @remarks URI might be encoded or not. It typically fails if URI is not encoded and contains a % character.
   * 
   * @param uri - The URI string to be decoded.
   * @returns The decoded URI string, or the original URI if decoding fails.
   */
  static getCleanURI(uri: string) {
    try {
      return decodeURIComponent(uri);
    } catch (e) {
      return uri;
    }
  }

  /**
   * Encodes a URL by replacing each instance of certain characters by one, two, three, or four escape sequences representing the UTF-8 encoding of the character.
   *
   * @param uri - The URI to be encoded.
   * @returns The encoded URI.
   */
  static encodeURL(url: string) {
    if(url.startsWith("https")) return url
    return url.split('/').map(encodeURIComponent).join('/')
  }

  /**
   * Extracts the file extension from a given file path.
   * 
   * @param filepath - The full path of the media file.
   * @returns The file extension of the media file.
   */
  static getBasePath(filepath: string) {
    return filepath.replace(/\.[^/.]+$/, "")
  }

  /**
   * Generates a human-readable name from a given file path.
   * 
   * This function performs the following transformations:
   * 1. Extracts the filename from the full file path.
   * 2. Replaces underscores and hyphens with spaces.
   * 3. Capitalizes the first letter of each word.
   * 
   * @param filepath - The full path of the media file.
   * @returns A prettified version of the media file name. If the filename cannot be determined, returns the original file path.
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
}