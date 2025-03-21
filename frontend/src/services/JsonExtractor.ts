/**
 * JsonExtractor - A utility class for extracting JSON code from text
 */
export class JsonExtractor {
  /**
   * Extracts JSON content from a string that may contain JSON within code blocks
   * @param text - The text containing JSON code, possibly within markdown code blocks
   * @returns The extracted JSON object or null if extraction fails
   */
  public static extract(text: string): any | null {
    try {
      // First try to parse the entire text as JSON
      return JSON.parse(text);
    } catch (e) {
      // If direct parsing fails, try to extract JSON from code blocks
      return this.extractFromCodeBlocks(text);
    }
  }

  /**
   * Extracts JSON from markdown code blocks
   * @param text - Text containing markdown code blocks
   * @returns The extracted JSON object or null if extraction fails
   */
  private static extractFromCodeBlocks(text: string): any | null {
    // Match content between ```json and ``` or between ``` and ```
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    
    // Use exec in a loop instead of matchAll for better compatibility
    let match;
    while ((match = jsonBlockRegex.exec(text)) !== null) {
      const jsonContent = match[1]?.trim();
      if (jsonContent) {
        try {
          return JSON.parse(jsonContent);
        } catch (e) {
          // Continue to the next match if this one fails
          continue;
        }
      }
    }

    // If no valid JSON found in code blocks, try to find JSON-like content with curly braces
    const possibleJsonRegex = /\{[\s\S]*\}/g;
    
    // Reset lastIndex to start from the beginning of the string
    possibleJsonRegex.lastIndex = 0;
    
    // Use exec in a loop for the second regex as well
    while ((match = possibleJsonRegex.exec(text)) !== null) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        // Continue to the next match if this one fails
        continue;
      }
    }

    return null;
  }

  /**
   * Safely extracts JSON and provides a typed result
   * @param text - The text containing JSON code
   * @param defaultValue - Default value to return if extraction fails
   * @returns The extracted JSON object cast to type T or the default value
   */
  public static extractTyped<T>(text: string, defaultValue: T): T {
    const result = this.extract(text);
    return result !== null ? (result as T) : defaultValue;
  }

  /**
   * Checks if a string contains valid JSON
   * @param text - The text to check
   * @returns True if the text contains valid JSON, false otherwise
   */
  public static containsJson(text: string): boolean {
    return this.extract(text) !== null;
  }
}
