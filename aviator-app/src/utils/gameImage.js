/**
 * Game images:
 * - New uploads → Cloudinary (res.cloudinary.com)
 * - Legacy Uploadcare URLs → remapped via cloudinaryUuidMap when possible
 */

import { CLOUDINARY_BY_UPLOADCARE_UUID } from '../config/cloudinaryUuidMap';
import { isTcLotteryGame } from './tcLottery';

const UCARE_UUID =
  /(?:https?:\/\/)?(?:www\.)?ucarecdn\.com\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;

export function isUploadcareUrl(url) {
  return Boolean(url && UCARE_UUID.test(String(url)));
}

export function cleanGameImageUrl(url) {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  const ucare = trimmed.match(UCARE_UUID);
  if (ucare) {
    const uuid = ucare[1].toLowerCase();
    // Prefer Cloudinary copy if we already have it
    if (CLOUDINARY_BY_UPLOADCARE_UUID[uuid]) {
      return CLOUDINARY_BY_UPLOADCARE_UUID[uuid];
    }
    return `https://ucarecdn.com/${ucare[1]}/`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return null;
}

export function needsImageUrlFix(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const ucare = trimmed.match(UCARE_UUID);
  if (ucare && CLOUDINARY_BY_UPLOADCARE_UUID[ucare[1].toLowerCase()]) {
    // Firestore still has Uploadcare URL but Cloudinary copy exists
    return true;
  }
  const cleaned = cleanGameImageUrl(url);
  return Boolean(cleaned && cleaned !== trimmed);
}

export function getGameImageSource(title, imageUrl) {
  if (isTcLotteryGame(title)) {
    return require('../../assets/lllll.jpeg');
  }

  const cleaned = cleanGameImageUrl(imageUrl);
  if (cleaned) {
    return { uri: cleaned };
  }

  return null;
}
