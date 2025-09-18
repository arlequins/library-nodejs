import crypto from 'crypto';
import { promisify } from 'util';

// --- Security Constants ---
// Set the key length for PBKDF2 to 64 bytes (512 bits).
const KEY_LENGTH = 64; 
// Increase the number of iterations based on OWASP recommendations. (Min 10,000+, higher is safer)
const ITERATIONS = 600000; 
// Hashing algorithm
const DIGEST = 'sha512';
// Set the salt length to 16 bytes (128 bits).
const SALT_BYTES = 16;
// Encoding format
const BYTE_TO_STRING_ENCODING = 'base64';

// Convert Node.js's callback-based crypto.pbkdf2 into a Promise-returning function.
const pbkdf2Async = promisify(crypto.pbkdf2);

/**
 * Type for the password information that is stored in the database.
 */
interface PersistedPassword {
  salt: string;
  hash: string;
  iterations: number;
}

/**
 * Generates a salt and hash for a new password.
 * Should be called on user creation or password change.
 * @param password - The plaintext password provided by the user.
 * @returns {Promise<PersistedPassword>} - The salt, hash, and iterations to be stored in the database.
 */
export const hashPassword = async (password: string): Promise<PersistedPassword> => {
  // 1. Generate a cryptographically secure, random salt.
  const salt = crypto.randomBytes(SALT_BYTES).toString(BYTE_TO_STRING_ENCODING);

  // 2. Hash the password using the generated salt.
  const hashBuffer = await pbkdf2Async(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );

  return {
    salt,
    hash: hashBuffer.toString(BYTE_TO_STRING_ENCODING),
    iterations: ITERATIONS,
  };
};

/**
 * Securely compares a password attempt against the persisted password information.
 * Should be called on user login.
 * @param persistedPassword - The password information (salt, hash, iterations) from the database.
 * @param passwordAttempt - The password attempt from the user trying to log in.
 * @returns {Promise<boolean>} - True if the passwords match, otherwise false.
 */
export const verifyPassword = async (
  persistedPassword: PersistedPassword,
  passwordAttempt: string,
): Promise<boolean> => {
  // 1. Hash the password attempt using the same salt and iterations.
  const attemptHashBuffer = await pbkdf2Async(
    passwordAttempt,
    persistedPassword.salt,
    persistedPassword.iterations,
    KEY_LENGTH,
    DIGEST
  );

  const persistedHashBuffer = Buffer.from(persistedPassword.hash, BYTE_TO_STRING_ENCODING);
  
  // 2. Use crypto.timingSafeEqual for a timing-attack-safe comparison.
  //    First, check if buffers have the same length, as timingSafeEqual throws an error otherwise.
  if (attemptHashBuffer.length !== persistedHashBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(attemptHashBuffer, persistedHashBuffer);
};
