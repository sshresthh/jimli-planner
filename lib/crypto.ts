// Web Crypto API Wrapper for AES-GCM database encryption

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptDatabase(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuf = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        key,
        data as BufferSource
    );

    // Combine IV and Ciphertext so they can be retrieved together during decryption
    const encryptedBytes = new Uint8Array(encryptedBuf);
    const finalPayload = new Uint8Array(iv.length + encryptedBytes.length);
    finalPayload.set(iv, 0);
    finalPayload.set(encryptedBytes, iv.length);
    return finalPayload;
}

export async function decryptDatabase(encryptedPayload: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const iv = encryptedPayload.slice(0, 12);
    const ciphertext = encryptedPayload.slice(12);

    try {
        const decryptedBuf = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            key,
            ciphertext as BufferSource
        );
        return new Uint8Array(decryptedBuf);
    } catch {
        throw new Error("Invalid password or corrupted database.");
    }
}

export function generateSalt(): Uint8Array {
    return window.crypto.getRandomValues(new Uint8Array(16));
}
