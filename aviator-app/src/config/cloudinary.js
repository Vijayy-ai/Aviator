import * as FileSystem from 'expo-file-system/legacy';

/**
 * Cloudinary client upload (unsigned preset — API secret must NEVER be in the app).
 * Cloud: dvpdhax7t | Preset: aviator_games (unsigned)
 */
export const CLOUDINARY_CLOUD_NAME = 'dvpdhax7t';
export const CLOUDINARY_UPLOAD_PRESET = 'aviator_games';

export function isCloudinaryConfigured() {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

function guessMime(uri) {
  const lower = String(uri).toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

/**
 * Upload local file URI or remote https URL to Cloudinary.
 * Local files are sent as base64 data URIs (avoids RN FormDataPart crash on SDK 58).
 * @returns {Promise<string>} secure_url
 */
export async function uploadToCloudinary(fileUriOrUrl) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'aviator-games');

  if (fileUriOrUrl.startsWith('http://') || fileUriOrUrl.startsWith('https://')) {
    formData.append('file', fileUriOrUrl);
  } else if (fileUriOrUrl.startsWith('data:')) {
    formData.append('file', fileUriOrUrl);
  } else {
    // Local file:// / content:// — read as base64 data URI
    const base64 = await FileSystem.readAsStringAsync(fileUriOrUrl, {
      encoding: 'base64',
    });
    const mime = guessMime(fileUriOrUrl);
    formData.append('file', `data:${mime};base64,${base64}`);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    const msg = data?.error?.message || `Cloudinary upload failed (${response.status})`;
    throw new Error(msg);
  }

  return data.secure_url;
}
