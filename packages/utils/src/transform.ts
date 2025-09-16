// --- Internal Helper Functions ---

/**
 * Converts a string to snake_case.
 * Handles camelCase and PascalCase inputs.
 * Preserves existing uppercase acronyms (e.g., "userID" -> "user_id").
 * @param input The string to convert.
 */
const toSnakeCase = (input: string): string => {
  // If already all uppercase (including underscores and digits), it's likely a constant, so keep as-is.
  if (/^[A-Z0-9_]+$/.test(input)) {
    return input;
  }
  // This regex correctly splits words from camelCase and PascalCase, including acronyms.
  const array = input.match(/[A-Z]{2,}(?=[A-Z][a-z]+\d*|\b)|[A-Z]?[a-z]+\d*|[A-Z]|\d+/g);
  return array ? array.map(x => x.toLowerCase()).join('_') : input;
};

/**
 * Converts a string from snake_case or kebab-case to camelCase.
 * @param input The string to convert.
 */
const toCamelCase = (input: string): string => {
  return input.replace(/([-_][a-z])/gi, $1 => $1.toUpperCase().replace('-', '').replace('_', ''));
};

/**
 * A generic recursive function to convert keys in objects and arrays.
 * This is the core logic that handles deep conversion.
 * @param data The data to process (object, array, or primitive).
 * @param caseConverter A function to convert a single key string (e.g., toSnakeCase).
 */
const convertKeys = (data: any, caseConverter: (key: string) => string): any => {
  // If the data is an array, map over it and recursively convert each element.
  if (Array.isArray(data)) {
    return data.map(item => convertKeys(item, caseConverter));
  }

  // Use a robust check for plain objects to avoid converting class instances, Date objects, etc.
  if (data !== null && typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]') {
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Convert the key using the provided converter function.
        const newKey = caseConverter(key);
        // Recursively call the function for the value and assign it to the new key.
        newObj[newKey] = convertKeys(data[key], caseConverter);
      }
    }
    return newObj;
  }

  // Return primitive values (string, number, boolean, null, undefined) as they are.
  return data;
};

// --- Publicly Exported Functions ---

/**
 * Recursively converts all keys of an object or array to snake_case.
 * @param data The object or array to be converted.
 */
export const convertKeysToSnakeCase = (data: any): any => {
  return convertKeys(data, toSnakeCase);
};

/**
 * Recursively converts all keys of an object or array to camelCase.
 * @param data The object or array to be converted.
 */
export const convertKeysToCamelCase = (data: any): any => {
  return convertKeys(data, toCamelCase);
};
