/**
 * Utility class for object manipulations
 */
export class ObjectUtils {
  /**
   * Reverses key-value pairs in an object
   * @param obj - Object to reverse
   * @returns New object with reversed mappings
   * @throws Error if input is not an object or is null
   */
  static reverseMap<T extends Record<string, unknown>>(obj: T): Record<string, keyof T> {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      throw new Error('Input must be a non-null object');
    }

    try {
      const reversed: Record<string, keyof T> = {};

      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          console.warn(`Skipping null/undefined value for key: ${key}`);
          continue;
        }

        // Convert value to string to ensure it can be used as a key
        const newKey = String(value);

        if (newKey in reversed) {
          console.warn(`Duplicate value found: ${value}. Previous key will be overwritten.`);
        }

        reversed[newKey] = key;
      }

      return reversed;
    } catch (error) {
      console.error('Error in reverseMap:', error);
      throw error;
    }
  }
}
