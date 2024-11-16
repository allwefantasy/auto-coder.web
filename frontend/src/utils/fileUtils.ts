// Utility function to determine the language based on file extension
export function getLanguageByFileName(fileName: string): string {
  if (!fileName) return 'plaintext';

  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const languageMap: { [key: string]: string } = {
    // Web languages
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'svg': 'xml',
    
    // Programming languages
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'cpp',
    'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    
    // Shell scripts
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    
    // Configuration files
    'yml': 'yaml',
    'yaml': 'yaml',
    'toml': 'toml',
    'ini': 'ini',
    'conf': 'plaintext',
    'config': 'plaintext',
    
    // Markup languages
    'md': 'markdown',
    'markdown': 'markdown',
    'txt': 'plaintext',
    
    // Database
    'sql': 'sql',
    
    // Other
    'dockerfile': 'dockerfile',
    'dockerignore': 'plaintext',
    'gitignore': 'plaintext',
    'env': 'plaintext'
  };

  if (!ext) return 'plaintext';
  
  // Check if it's a Dockerfile
  if (fileName.toLowerCase() === 'dockerfile') {
    return 'dockerfile';
  }

  return languageMap[ext] || 'plaintext';
}