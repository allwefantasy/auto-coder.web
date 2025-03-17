/**
 * Utility functions for parsing file content from text
 * This module provides functionality to parse text that contains file paths and content
 * in a specific format (##File: {absolute_path}\n\n{content}) into structured data.
 */

/**
 * Interface representing a parsed file
 */
export interface ParsedFile {
  file: string;
  content: string;
}

/**
 * Enum for parser states
 */
enum ParserState {
  LOOKING_FOR_FILE_MARKER,
  READING_FILE_PATH,
  READING_CONTENT
}

/**
 * Parses text containing file information in the format:
 * ##File: {absolute_path}
 * 
 * {content}
 * 
 * @param text - The text to parse
 * @returns An array of parsed file objects
 */
export function parseFilesFromText(text: string): ParsedFile[] {
  // Return empty array if text is empty or undefined
  if (!text) {
    return [];
  }

  const result: ParsedFile[] = [];
  const lines = text.split('\n');
  
  let state = ParserState.LOOKING_FOR_FILE_MARKER;
  let currentFile = '';
  let currentContent = '';
  let emptyLineAfterPath = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    switch (state) {
      case ParserState.LOOKING_FOR_FILE_MARKER:
        // Check if the line starts with the file marker
        if (line.startsWith('##File:')) {
          state = ParserState.READING_FILE_PATH;
          // Extract the file path (remove '##File:' prefix and trim)
          currentFile = line.substring(7).trim();
          emptyLineAfterPath = false;
        }
        break;
        
      case ParserState.READING_FILE_PATH:
        // After reading the file path, we expect an empty line
        if (line.trim() === '') {
          state = ParserState.READING_CONTENT;
          currentContent = '';
          emptyLineAfterPath = true;
        } else {
          // If there's no empty line, append to the file path (multiline path)
          currentFile += ' ' + line.trim();
        }
        break;
        
      case ParserState.READING_CONTENT:
        // Check if we've reached a new file marker
        if (line.startsWith('##File:')) {
          // Save the current file and content
          result.push({
            file: currentFile,
            content: currentContent.trim()
          });
          
          // Start parsing the new file
          state = ParserState.READING_FILE_PATH;
          currentFile = line.substring(7).trim();
          emptyLineAfterPath = false;
        } else {
          // If we haven't seen the empty line after the path yet, this is the empty line
          if (!emptyLineAfterPath && line.trim() === '') {
            emptyLineAfterPath = true;
          } else {
            // Add the line to the content
            // If it's not the first line of content, add a newline before it
            if (currentContent.length > 0) {
              currentContent += '\n';
            }
            currentContent += line;
          }
        }
        break;
    }
  }
  
  // Don't forget to add the last file if we were in the middle of reading content
  if (state === ParserState.READING_CONTENT && currentFile) {
    result.push({
      file: currentFile,
      content: currentContent.trim()
    });
  }
  
  return result;
}

/**
 * Formats parsed files back into the original text format
 * 
 * @param files - Array of parsed file objects
 * @returns Formatted text string
 */
export function formatFilesToText(files: ParsedFile[]): string {
  if (!files || files.length === 0) {
    return '';
  }
  
  const formattedBlocks: string[] = [];
  
  for (const file of files) {
    // Create a block for each file with the proper format
    const fileMarker = `##File: ${file.file}`;
    const content = file.content;
    
    // Combine the file marker, an empty line, and the content
    formattedBlocks.push(`${fileMarker}\n\n${content}`);
  }
  
  // Join all blocks with double newlines
  return formattedBlocks.join('\n\n');
}
