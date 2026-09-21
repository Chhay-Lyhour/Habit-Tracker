export const MAX_AVATAR_BYTES = 1024 * 1024; // 1,048,576 bytes
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

// True if bytes[offset...] starts with every value in `signature`.
function matchesAt(bytes, signature, offset = 0) {
    if (bytes.length < offset + signature.length) return false;
    return signature.every((value, i) => bytes[offset + i] === value);
}

// Returns the real MIME type based on the file's first bytes, or null.
function detectImageType(bytes) {
    if (matchesAt(bytes, PNG_SIGNATURE)) return "image/png";
    if (matchesAt(bytes, JPEG_SIGNATURE)) return "image/jpeg";
    // WebP: "RIFF" at 0-3, four length bytes (ignored), "WEBP" at 8-11
    if (matchesAt(bytes, RIFF) && matchesAt(bytes, WEBP, 8)) return "image/webp";
    return null;
}

export async function validateAvatar(file) {
    // Guard 1: a file exists and isn't empty
    if (!file) {
        return { ok: false, error: "Pick an image first." };
    }
    if (file.size === 0) {
        return { ok: false, error: "That file is empty. Try a different image." };
    }

    // Guard 2: MIME type is on the allowlist
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
        return { ok: false, error: "Please choose a JPG, PNG or WebP image." };
    }

    // Guard 3: size is at most 1 MB (inclusive)
    if (file.size > MAX_AVATAR_BYTES) {
        return { ok: false, error: "That image is over 1 MB. Try a smaller one." };
    }

    // Guard 4: the first bytes prove it's really an image
    let bytes;
    try {
        const buffer = await file.slice(0, 12).arrayBuffer();
        bytes = new Uint8Array(buffer);
    } catch {
        return {
            ok: false,
            error: "We couldn't read that file. Please pick it again.",
        };
    }

    const detected = detectImageType(bytes);
    if (!detected || detected !== file.type) {
        return {
            ok: false,
            error: "That file isn't really an image. Try a different one.",
        };
    }

    return { ok: true };
}