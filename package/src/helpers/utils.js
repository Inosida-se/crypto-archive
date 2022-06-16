import base64 from 'base64-js'

export const generatePassword = (
  length = 32,
  wishlist = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
) =>
  Array.from(crypto.getRandomValues(new Uint32Array(length)))
    .map((x) => wishlist[x % wishlist.length])
    .join("");

const ECE_RECORD_SIZE = 1024 * 64;
const TAG_LENGTH = 16;
export function encryptedSize(size, rs = ECE_RECORD_SIZE, tagLength = TAG_LENGTH) {
  const chunk_meta = tagLength + 1; // Chunk metadata, tag and delimiter
  return 21 + size + chunk_meta * Math.ceil(size / (rs - chunk_meta));
}

export function arrayToB64 (array) {
  return base64.fromByteArray(array)
}

export function b64ToArray (str) {
  return base64.toByteArray(str + '==='.slice((str.length + 3) % 4))
}
