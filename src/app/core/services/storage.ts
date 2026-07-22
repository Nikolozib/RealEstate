import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { compressImage, CompressOptions } from '../utils/image-compress';

// Uploads property photos to Firebase Storage, compressing them client-side
// first (see image-compress.ts) so oversized camera photos never hit the
// network or the bucket at full size.
@Injectable({ providedIn: 'root' })
export class StorageService {
  private storage = inject(Storage);

  async uploadPropertyImage(file: File, options?: CompressOptions): Promise<string> {
    const { blob } = await compressImage(file, options);
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `properties/${crypto.randomUUID()}.${ext}`;
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, blob, { contentType: blob.type });
    return getDownloadURL(storageRef);
  }

  // Best-effort cleanup when an admin replaces/removes an image — failures
  // (already deleted, permission edge cases) are never worth surfacing.
  async deletePropertyImage(url: string): Promise<void> {
    try {
      await deleteObject(ref(this.storage, url));
    } catch {
      // Non-fatal.
    }
  }
}
