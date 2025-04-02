/**
 * Formats a number with commas as thousands separators.
 * @param num The number to format.
 * @returns A formatted string representation of the number.
 */
export function formatNumberWithCommas(num: number | string): string {
  if (typeof num === 'string') {
    num = parseFloat(num);
    if (isNaN(num)) {
      return ''; // Or handle error as appropriate
    }
  }
  return num.toLocaleString();
}

/**
 * Renders a string template by replacing placeholders like {{key}} with values from the params object.
 * @param template The template string.
 * @param params An object containing key-value pairs for replacement.
 * @returns The rendered string.
 */
export function renderStringTemplate(template: string, params: { [key: string]: any }): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return params.hasOwnProperty(key) ? String(params[key]) : match;
  });
}

/**
 * Formats a number representing bytes into a human-readable string (KB, MB, GB, etc.).
 * @param bytes The number of bytes.
 * @param decimals The number of decimal places to display (default: 2).
 * @returns A human-readable file size string.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Formats a number to a specified number of decimal places.
 * @param num The number to format.
 * @param precision The number of decimal places to keep (default: 2).
 * @returns A string representation of the number with the specified precision.
 */
export function formatNumberToFixed(num: number | string, precision: number = 2): string {
  let numericValue: number;

  if (typeof num === 'string') {
    numericValue = parseFloat(num);
    if (isNaN(numericValue)) {
      return ''; // Or handle error as appropriate, e.g., return 'NaN' or throw error
    }
  } else {
    numericValue = num;
  }

  if (typeof numericValue !== 'number' || isNaN(numericValue)) {
     return ''; // Handle cases where conversion might still fail or input was not a number
  }

  const effectivePrecision = precision < 0 ? 0 : precision;
  return numericValue.toFixed(effectivePrecision);
}
