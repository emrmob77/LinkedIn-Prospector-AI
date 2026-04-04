import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('SETTINGS_ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length !== 64) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * API key'i AES-256-GCM ile şifreler.
 * Format: base64(iv + authTag + ciphertext)
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // iv (16) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * AES-256-GCM ile şifrelenmiş API key'i çözer.
 */
export function decryptApiKey(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * API key'in ilk ve son karakterlerini gösterir, ortasını maskeler.
 * Örn: "sk-ant-abc123...xyz9"
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) return '****';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}
