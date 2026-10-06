import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_BASE_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

class StorageService {
  constructor() {
    this.jdsDir = path.join(UPLOADS_BASE_DIR, 'jds');
    this._ensureDirectoriesExist();
  }

  _ensureDirectoriesExist() {
    if (!fs.existsSync(UPLOADS_BASE_DIR)) {
      fs.mkdirSync(UPLOADS_BASE_DIR, { recursive: true });
    }
    if (!fs.existsSync(this.jdsDir)) {
      fs.mkdirSync(this.jdsDir, { recursive: true });
    }
  }

  /**
   * Save a file buffer to storage
   * @param {Object} options - { buffer, originalname, organizationId }
   * @returns {Promise<{ storageKey: string, storageProvider: string }>}
   */
  async saveFile({ buffer, originalname, organizationId }) {
    this._ensureDirectoriesExist();

    const ext = path.extname(originalname).toLowerCase() || '.bin';
    const randomHex = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}_${randomHex}${ext}`;
    
    // Sub-folder per organization to prevent flat directory bloat
    const orgFolder = path.join(this.jdsDir, organizationId.toString());
    if (!fs.existsSync(orgFolder)) {
      fs.mkdirSync(orgFolder, { recursive: true });
    }

    const relativeKey = path.join('jds', organizationId.toString(), filename).replace(/\\/g, '/');
    const absolutePath = path.join(this.jdsDir, organizationId.toString(), filename);

    await fs.promises.writeFile(absolutePath, buffer);

    return {
      storageKey: relativeKey,
      storageProvider: 'LOCAL',
    };
  }

  /**
   * Get absolute system path for a given storageKey
   * @param {string} storageKey
   * @returns {string}
   */
  getFilePath(storageKey) {
    // Prevent path traversal attacks
    const safeKey = path.normalize(storageKey).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(UPLOADS_BASE_DIR, safeKey);
    return absolutePath;
  }

  /**
   * Delete a stored file by key
   * @param {string} storageKey
   */
  async deleteFile(storageKey) {
    try {
      const filePath = this.getFilePath(storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.error(`Failed to delete stored file ${storageKey}:`, err);
    }
  }
}

export const storageService = new StorageService();
export default storageService;
