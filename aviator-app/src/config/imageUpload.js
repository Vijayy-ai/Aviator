import { uploadToCloudinary, isCloudinaryConfigured } from './cloudinary';

/**
 * All game images go to Cloudinary (not Firebase Storage / Uploadcare).
 */
export async function uploadGameImage(imageUri) {
  if (!imageUri) {
    throw new Error('No image provided');
  }
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }
  console.log('Uploading to Cloudinary...');
  return uploadToCloudinary(imageUri);
}

export function getImageStorageLabel() {
  return 'Cloudinary';
}
