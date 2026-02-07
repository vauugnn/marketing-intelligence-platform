import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY not set in environment');
  }

  // Derive a proper 32-byte key using PBKDF2
  const salt = Buffer.from('marketing-intelligence-platform-salt');
  return crypto.pbkdf2Sync(key, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data (e.g., OAuth tokens)
 * Returns: encrypted_data:iv:authTag (base64)
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Return format: encrypted:iv:authTag (all base64)
  return `${encrypted}:${iv.toString('base64')}:${authTag.toString('base64')}`;
}

/**
 * Decrypt encrypted data
 * Input format: encrypted_data:iv:authTag (base64)
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const [encrypted, ivBase64, authTagBase64] = parts;

  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
