// Image Metadata Editor - Fixed modal control bindings and complete script
// Uses piexifjs (included in index.html)

/* Globals & small helpers */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = (n=6) => Math.random().toString(36).slice(2, 2+n);

function readAsArrayBuffer(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(r.error || new Error('File read error'));
        r.readAsArrayBuffer(file);
    });
}
function readAsText(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = () => rej(r.error || new Error('File read error'));
        r.readAsText(file);
    });
}
function arrayBufferToBinaryString(ab) {
    const bytes = new Uint8Array(ab);
    let s = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return s;
}
function binaryStringToArrayBuffer(str) {
    const buf = new ArrayBuffer(str.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) view[i] = str.charCodeAt(i) & 0xff;
    return buf;
}
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
}
function showToast(message, type='info', duration=2500) {
    const el = document.createElement('div');
    el.className = 'discord-notification ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '');
    el.style.position = 'fixed';
    el.style.right = '16px';
    el.style.bottom = '16px';
    el.style.zIndex = 99999;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(()=> el.remove(), duration);
}

/* Utility functions */

function parseLorasFromText(text) {
    if (!text || typeof text !== 'string') return [];
    const set = new Set();
    let m;
    const re1 = /<\s*lora\s*:\s*([^:>]+)(?:\s*:\s*([0-9.]+))?\s*>/ig;
    while ((m = re1.exec(text)) !== null) {
        const name = m[1].trim();
        const weight = m[2] ? m[2].trim() : null;
        set.add(weight ? `${name}:${weight}` : name);
    }
    const re2 = /\b(?:lora|LORA)\s*:\s*([a-zA-Z0-9_\-\/. ]+)(?:\s*:\s*([0-9.]+))?/g;
    while ((m = re2.exec(text)) !== null) {
        const name = m[1].trim();
        const weight = m[2] ? m[2].trim() : null;
        set.add(weight ? `${name}:${weight}` : name);
    }
    const re3 = /<\s*LoRA\s*:\s*([^>]+)\s*>/ig;
    while ((m = re3.exec(text)) !== null) {
        set.add(m[1].trim());
    }
    // New regex to capture "Name: 12-char-hex-hash" patterns, potentially spanning newlines
    const re4 = /([a-zA-Z0-9_\-\/\.]+):\s*([a-f0-9]{12})/ig;
    while ((m = re4.exec(text)) !== null) {
        const name = m[1].trim();
        const hash = m[2].trim();
        set.add(`${name}: ${hash}`);
    }
    return Array.from(set);
}

function parseParametersStringToObject(str) {
    const map = {};
    if (!str || typeof str !== 'string') return map;
    const tokens = str.split(/\n|,/).map(t => t.trim()).filter(Boolean);
    for (const t of tokens) {
        const idx = t.indexOf(':');
        if (idx > -1) {
            const k = t.substring(0, idx).replace(/\s+/g,' ').trim();
            const v = t.substring(idx + 1).trim();
            if (k) map[k] = v;
        } else {
            const eq = t.indexOf('=');
            if (eq > -1) {
                const k = t.substring(0, eq).trim();
                const v = t.substring(eq + 1).trim();
                if (k) map[k] = v;
            } else {
                if (!map.Other) map.Other = t; else map.Other += '; ' + t;
            }
        }
    }
    return map;
}

function extractCheckpointFromParams(map = {}, metadata = {}) {
    const keys = ['Checkpoint','Model','sd_model_checkpoint','Model hash','checkpoint','model'];
    for (const k of keys) {
        if (map[k]) return map[k];
        if (metadata.raw && metadata.raw[k]) return metadata.raw[k];
    }
    if (Array.isArray(metadata.parameters)) {
        for (const p of metadata.parameters) {
            const lower = String(p).toLowerCase();
            if (lower.includes('model:') || lower.includes('checkpoint:')) return p;
        }
    }
    if (metadata.prompt) {
        const m = metadata.prompt.match(/Model:\s*([^\n,]+)/i) || metadata.prompt.match(/checkpoint:\s*([^\n,]+)/i);
        if (m) return m[1].trim();
    }
    return null;
}

/* CRC32 table */
const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            if (c & 1) c = 0xedb88320 ^ (c >>> 1);
            else c = c >>> 1;
        }
        t[i] = c >>> 0;
    }
    return t;
})();
function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

/* --- MetadataParser --- */
class MetadataParser {
    static async parseFile(file) {
        if (!file) return {};
        const name = (file.name || '').toLowerCase();
        const type = (file.type || '').toLowerCase();
        try {
            if (type === 'image/png' || name.endsWith('.png')) {
                const ab = await readAsArrayBuffer(file);
                const out = await MetadataParser.parsePNG(ab);
                out.paramsMap = parseParametersStringToObject((out.parameters || []).join(', '));
                return out;
            } else if (type.includes('jpeg') || type.includes('jpg') || name.match(/\.(jpe?g)$/)) {
                const ab = await readAsArrayBuffer(file);
                const out = await MetadataParser.parseJPEG(ab);
                out.paramsMap = parseParametersStringToObject((out.parameters || []).join(', '));
                return out;
            } else if (type === 'image/webp' || name.endsWith('.webp')) {
                const ab = await readAsArrayBuffer(file);
                const out = await MetadataParser.parseWEBP(ab);
                out.paramsMap = parseParametersStringToObject((out.parameters || []).join(', '));
                return out;
            } else if (name.endsWith('.safetensors')) {
                const out = await MetadataParser.parseSafeTensors(file); // Use the new binary parser
                out.paramsMap = parseParametersStringToObject((out.parameters || []).join(', '));
                return out;
            }
        } catch (err) {
            console.warn('parseFile error', err);
            return {error: String(err)};
        }
        return {};
    }

    static guessAsciiFromBuffer(ab) {
        const bytes = new Uint8Array(ab);
        let s = '';
        for (let i = 0; i < Math.min(10240, bytes.length); i++) {
            const b = bytes[i];
            if (b >= 32 && b <= 126) s += String.fromCharCode(b);
            else s += ' ';
        }
        return s;
    }

    static async parsePNG(ab) {
        const dv = new DataView(ab);
        const out = { format: 'png', parameters: [], prompt: null, negative: null, comfy: null, xmp: null, raw: {} };
        if (dv.byteLength < 8) return out;
        const pngSig = [0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A];
        for (let i=0;i<8;i++) if (dv.getUint8(i) !== pngSig[i]) return out;
        let offset = 8;
        while (offset + 8 <= dv.byteLength) {
            const length = dv.getUint32(offset, false);
            const type = String.fromCharCode(
                dv.getUint8(offset+4), dv.getUint8(offset+5), dv.getUint8(offset+6), dv.getUint8(offset+7)
            );
            const dataStart = offset + 8;
            const dataEnd = dataStart + length;
            if (dataEnd > dv.byteLength) break;
            const chunkBytes = new Uint8Array(ab.slice(dataStart, dataEnd));
            if (type === 'tEXt') {
                let txt;
                try { txt = new TextDecoder('utf-8').decode(chunkBytes); } catch(e) { txt = String.fromCharCode.apply(null, chunkBytes); }
                const zero = txt.indexOf('\0');
                if (zero >= 0) {
                    const key = txt.slice(0, zero);
                    const value = txt.slice(zero+1);
                    out.raw[key] = (out.raw[key] || '') + value;
                    MetadataParser.ingestTextKey(out, key, value);
                } else {
                    const idx = txt.indexOf(':');
                    if (idx >= 0) {
                        const key = txt.slice(0, idx).trim();
                        const value = txt.slice(idx+1).trim();
                        out.raw[key] = (out.raw[key] || '') + value;
                        MetadataParser.ingestTextKey(out, key, value);
                    } else {
                        out.raw.text = (out.raw.text || '') + txt;
                        MetadataParser.ingestTextKey(out, 'text', txt);
                    }
                }
            } else if (type === 'iTXt') {
                let txt;
                try { txt = new TextDecoder('utf-8').decode(chunkBytes); } catch(e) { txt = new TextDecoder('latin1').decode(chunkBytes); }
                const parts = txt.split('\0');
                const key = parts.shift() || 'iTXt';
                const remainder = parts.join('\0');
                out.raw[key] = (out.raw[key] || '') + remainder;
                MetadataParser.ingestTextKey(out, key, remainder);
            } else if (type === 'zTXt') {
                // compressed; we do not decompress here — mark presence
                out.raw.zTXt = (out.raw.zTXt || '') + '[zTXt chunk present]';
            } else if (type === 'IEND') {
                break;
            }
            offset = dataEnd + 4;
        }
        return out;
    }

    static async parseJPEG(ab) {
        const binStr = arrayBufferToBinaryString(ab);
        const out = { format: 'jpeg', parameters: [], prompt: null, negative: null, xmp: null, raw: {} };
        try {
            const exifObj = piexif.load(binStr);
            if (exifObj.Image && exifObj.Image[piexif.ImageIFD.ImageDescription]) {
                const desc = exifObj.Image[piexif.ImageIFD.ImageDescription];
                out.raw.ImageDescription = desc;
                const parsed = MetadataParser.parseA1111Parameters(desc);
                if (parsed.prompt && !out.prompt) out.prompt = parsed.prompt;
                if (parsed.negative && !out.negative) out.negative = parsed.negative;
                out.parameters = out.parameters.concat(parsed.paramsArray || []);
            }
            if (exifObj.Exif && exifObj.Exif[piexif.ExifIFD.UserComment]) {
                let uc = exifObj.Exif[piexif.ExifIFD.UserComment];
                if (Array.isArray(uc) || uc instanceof Uint8Array) {
                    try { uc = new TextDecoder('utf-8').decode(new Uint8Array(uc)); } catch(e) { uc = String(uc); }
                }
                out.raw.UserComment = uc;
                const parsed = MetadataParser.parseA1111Parameters(uc);
                out.parameters = out.parameters.concat(parsed.paramsArray || []);
                if (parsed.prompt && !out.prompt) out.prompt = parsed.prompt;
                if (parsed.negative && !out.negative) out.negative = parsed.negative;
            }
        } catch (e) {
            // no exif or parsing failed
        }
        try {
            const xmpMatch = binStr.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/i);
            if (xmpMatch) {
                const xmp = xmpMatch[0];
                out.xmp = xmp;
                const rdMatch = xmp.match(/<rdf:Description[^>]*>([\s\S]*?)<\/rdf:Description>/i);
                if (rdMatch && rdMatch[1]) {
                    const inner = rdMatch[1].replace(/<[^>]+>/g,'').trim();
                    const parsed = MetadataParser.parseA1111Parameters(inner);
                    if (parsed.prompt && !out.prompt) out.prompt = parsed.prompt;
                    if (parsed.negative && !out.negative) out.negative = parsed.negative;
                    out.parameters = out.parameters.concat(parsed.paramsArray || []);
                } else {
                    const pMatch = xmp.match(/<parameters>([\s\S]*?)<\/parameters>/i);
                    if (pMatch && pMatch[1]) {
                        const t = pMatch[1].replace(/<[^>]+>/g,'').trim();
                        const parsed = MetadataParser.parseA1111Parameters(t);
                        out.parameters = out.parameters.concat(parsed.paramsArray || []);
                        if (parsed.prompt && !out.prompt) out.prompt = parsed.prompt;
                        if (parsed.negative && !out.negative) out.negative = parsed.negative;
                    }
                }
            }
        } catch(e) {}
        return out;
    }

    static async parseWEBP(ab) {
        const binStr = arrayBufferToBinaryString(ab);
        const out = { format: 'webp', parameters: [], prompt: null, negative: null, raw: {} };
        try {
            const xmpMatch = binStr.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/i);
            if (xmpMatch) {
                const xmp = xmpMatch[0];
                out.raw.xmp = xmp;
                const parsed = MetadataParser.parseA1111Parameters(xmp.replace(/<[^>]+>/g,''));
                out.parameters = out.parameters.concat(parsed.paramsArray || []);
                if (parsed.prompt) out.prompt = parsed.prompt;
                if (parsed.negative) out.negative = parsed.negative;
            } else {
                const p = binStr.match(/parameters[:=]\s*([^\n\r<]{10,2000})/i);
                if (p) {
                    const parsed = MetadataParser.parseA1111Parameters(p[1]);
                    out.parameters = out.parameters.concat(parsed.paramsArray || []);
                    if (parsed.prompt) out.prompt = parsed.prompt;
                }
            }
        } catch(e) {}
        return out;
    }

    static parseSafeTensorsFromText(text) {
        // This method is no longer used for binary safetensors parsing.
        // It remains for backward compatibility or if text-based safetensors parsing is still needed elsewhere.
        const out = { format: 'safetensors', lora: null, parameters: [], raw: {} };
        if (!text || typeof text !== 'string') return out;
        const jsonMatch = text.match(/\{[\s\S]{0,20000}?\}/);
        if (jsonMatch) {
            try {
                const obj = JSON.parse(jsonMatch[0]);
                out.lora = obj;
                if (obj.metadata) out.parameters.push(JSON.stringify(obj.metadata));
                else {
                    if (obj.base_model) out.parameters.push('Base Model: ' + obj.base_model);
                    if (obj.model) out.parameters.push('Model: ' + obj.model);
                    if (obj.tag_frequency) out.parameters.push('Tag Frequency: ' + JSON.stringify(obj.tag_frequency));
                }
            } catch (e) {
                out.raw.safetensors = jsonMatch[0];
            }
        }
        return out;
    }

    static async parseSafeTensors(file) {
        const out = { format: 'safetensors', lora: null, parameters: [], raw: {} };
        try {
            const METADATA_SIZE_OFFSET = 0;
            const METADATA_CONTENT_OFFSET = 8;

            // Read the first 8 bytes to get the metadata size
            const metadataSizeBlob = file.slice(METADATA_SIZE_OFFSET, METADATA_CONTENT_OFFSET);
            const metadataSizeArrayBuffer = await readAsArrayBuffer(metadataSizeBlob);
            const metadataSize = new DataView(metadataSizeArrayBuffer).getUint32(0, true);

            // Read the metadata chunk
            const metadataBlob = file.slice(METADATA_CONTENT_OFFSET, METADATA_CONTENT_OFFSET + metadataSize);
            const metadataArrayBuffer = await readAsArrayBuffer(metadataBlob);
            const header = JSON.parse(new TextDecoder('utf-8').decode(new Uint8Array(metadataArrayBuffer)));

            // The actual metadata is likely under '__metadata__' key
            let formattedMetadata = header['__metadata__'] || {};
            
            // If formattedMetadata is a string, parse it again
            if (typeof formattedMetadata === 'string') {
                try {
                    formattedMetadata = JSON.parse(formattedMetadata);
                } catch (e) {
                    // If it's not JSON, just use it as is
                }
            }

            out.lora = formattedMetadata; // Store the parsed metadata here
            
            // Populate parameters array for display if needed
            for (const key in formattedMetadata) {
                if (Object.hasOwnProperty.call(formattedMetadata, key)) {
                    out.parameters.push(`${key}: ${JSON.stringify(formattedMetadata[key])}`);
                }
            }

        } catch (error) {
            console.error('Error parsing safetensors file:', error);
            out.error = String(error);
        }
        return out;
    }

    static parseA1111Parameters(text) {
        const out = { prompt: null, negative: null, paramsArray: [], paramsMap: {} };
        if (!text || typeof text !== 'string') return out;
        const t = text.replace(/\r/g,'').trim();
        const promptMatch = t.match(/(?:^|\n)Prompt:\s*([\s\S]*?)(?:\nNegative prompt:|\nSteps:|\nSampler:|$)/i);
        if (promptMatch) out.prompt = promptMatch[1].trim();
        const negMatch = t.match(/(?:^|\n)Negative prompt:\s*([\s\S]*?)(?:\nSteps:|\nSampler:|$)/i);
        if (negMatch) out.negative = negMatch[1].trim();
        if (!out.prompt) {
            const lines = t.split('\n').map(s=>s.trim()).filter(Boolean);
            if (lines.length && lines[0].length > 40) out.prompt = lines[0];
        }
        const inlineParamsMatch = t.match(/(?:\n|^)(Steps:.*)$/im);
        let inline = inlineParamsMatch ? inlineParamsMatch[1] : null;
        if (!inline) {
            const lines = t.split('\n').map(s=>s.trim()).filter(Boolean);
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].includes(':') && lines[i].includes(',')) { inline = lines[i]; break; }
            }
        }
        if (inline) {
            const parts = inline.split(',').map(p => p.trim()).filter(Boolean);
            for (const p of parts) {
                out.paramsArray.push(p);
                const idx = p.indexOf(':');
                if (idx > -1) out.paramsMap[p.substring(0,idx).trim()] = p.substring(idx+1).trim();
            }
        } else {
            const genericParts = t.match(/(Steps:\s*\d+|Sampler:\s*[^,]+|CFG scale:\s*[^,]+|Seed:\s*[^,]+|Size:\s*[^,]+)/ig);
            if (genericParts) {
                genericParts.forEach(p => { out.paramsArray.push(p); const idx = p.indexOf(':'); if (idx>-1) out.paramsMap[p.substring(0,idx).trim()] = p.substring(idx+1).trim(); });
            }
        }
        return out;
    }

    static ingestTextKey(out, key, value) {
        const lk = (key || '').toLowerCase();
        if (lk.includes('parameter') || lk === 'parameters' || lk === 'a1111_parameters') {
            const parsed = MetadataParser.parseA1111Parameters(value);
            if (parsed.prompt && !out.prompt) out.prompt = parsed.prompt;
            if (parsed.negative && !out.negative) out.negative = parsed.negative;
            out.parameters = out.parameters.concat(parsed.paramsArray || []);
        } else if (lk.includes('prompt') && value && value.length > 0) {
            if (!out.prompt) out.prompt = value;
        } else if (lk.includes('comfy') && value && value.trim().startsWith('{')) {
            try { out.comfy = JSON.parse(value); } catch(e) { out.raw[key] = value; }
        } else if (lk.includes('xmp') || lk.includes('xml') || (value && value.includes('<x:xmpmeta'))) {
            out.xmp = value;
            const parsed = MetadataParser.parseA1111Parameters(value.replace(/<[^>]+>/g,''));
            out.parameters = out.parameters.concat(parsed.paramsArray || []);
        } else {
            out.raw[key] = value;
        }
    }
}

/* --- Image Metadata Utilities (from edit_image.html) --- */
const ImageMetadataUtils = {
    async getImageTypeFromBinarySignature(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (e) {
                const bytes = new Uint8Array(e.target.result);
                // JPEG
                if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
                    return resolve('image/jpeg');
                }
                // PNG
                if (
                    bytes[0] === 0x89 && bytes[1] === 0x50 &&
                    bytes[2] === 0x4E && bytes[3] === 0x47 &&
                    bytes[4] === 0x0D && bytes[5] === 0x0A &&
                    bytes[6] === 0x1A && bytes[7] === 0x0A
                ) {
                    return resolve('image/png');
                }
                // WebP: "RIFF" then "WEBP" at bytes 8-11
                if (
                    bytes[0] === 0x52 && bytes[1] === 0x49 &&
                    bytes[2] === 0x46 && bytes[3] === 0x46 &&
                    bytes[8] === 0x57 && bytes[9] === 0x45 &&
                    bytes[10] === 0x42 && bytes[11] === 0x50
                ) {
                    return resolve('image/webp');
                }
                return resolve('unknown');
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file.slice(0, 16));
        });
    },
    Models: {
        A1111Metadata: class {
            constructor({
                prompt = '',
                negative = '',
                extra = 'Steps: 0',
            } = {}) {
                this.prompt = prompt;
                this.negative = negative;
                this.extra = extra;
            }
        }
    }
};

const JpgUtils = {
    editJPEGUserComment(arrayBuffer, userComment) {
        const view = new DataView(arrayBuffer);
        let offset = 0;
        const segments = [];

        while (offset < view.byteLength) {
            if (view.getUint8(offset) !== 0xFF) {
                throw new Error("Not a valid JPEG file");
            }
            const marker = view.getUint8(offset + 1);
            if (marker === 0xD8 || marker === 0xD9) { // SOI or EOI
                segments.push(new Uint8Array(arrayBuffer.slice(offset, offset + 2)));
                offset += 2;
                continue;
            }
            const length = view.getUint16(offset + 2);
            const segmentData = new Uint8Array(arrayBuffer.slice(offset, offset + 2 + length));
            segments.push(segmentData);
            offset += 2 + length;
        }

        // Find APP1 segment (EXIF)
        let app1SegmentIndex = -1;
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].length >= 6 && segments[i][0] === 0xFF && segments[i][1] === 0xE1 &&
                segments[i][4] === 0x45 && segments[i][5] === 0x78) { // Exif
                app1SegmentIndex = i;
                break;
            }
        }

        const newUserCommentBytes = new TextEncoder().encode(userComment);
        const userCommentTag = 0x9286; // EXIF UserComment tag

        if (app1SegmentIndex !== -1) {
            // Modify existing APP1 segment
            const app1Data = new Uint8Array(segments[app1SegmentIndex].slice(4)); // Skip FF E1 Length
            const exifData = new DataView(app1Data.buffer);
            let exifOffset = 6; // Skip Exif\0\0
            const tiffHeaderOffset = exifOffset;

            const byteOrder = exifData.getUint16(tiffHeaderOffset) === 0x4949 ? 'little' : 'big';
            const getUint16 = (o) => exifData.getUint16(o, byteOrder === 'little');
            const getUint32 = (o) => exifData.getUint32(o, byteOrder === 'little');

            const ifd0Offset = getUint32(tiffHeaderOffset + 4);
            let ifdOffset = ifd0Offset;
            let exifIfdOffset = 0;

            // Find Exif IFD
            while (ifdOffset !== 0) {
                const numEntries = getUint16(tiffHeaderOffset + ifdOffset);
                for (let i = 0; i < numEntries; i++) {
                    const entryOffset = tiffHeaderOffset + ifdOffset + 2 + i * 12;
                    const tag = getUint16(entryOffset);
                    if (tag === 0x8769) { // Exif IFD tag
                        exifIfdOffset = getUint32(entryOffset + 8);
                        break;
                    }
                }
                if (exifIfdOffset) break;
                ifdOffset = getUint32(tiffHeaderOffset + ifdOffset + 2 + numEntries * 12);
            }

            if (exifIfdOffset) {
                // Modify Exif IFD
                const exifIfdNumEntries = getUint16(tiffHeaderOffset + exifIfdOffset);
                let userCommentEntryOffset = -1;
                for (let i = 0; i < exifIfdNumEntries; i++) {
                    const entryOffset = tiffHeaderOffset + exifIfdOffset + 2 + i * 12;
                    const tag = getUint16(entryOffset);
                    if (tag === userCommentTag) {
                        userCommentEntryOffset = entryOffset;
                        break;
                    }
                }

                if (userCommentEntryOffset !== -1) {
                    // Replace existing UserComment
                    const newExifData = new Uint8Array(app1Data.byteLength + newUserCommentBytes.length - getUint32(userCommentEntryOffset + 4));
                    newExifData.set(app1Data.slice(0, userCommentEntryOffset + 8)); // Copy up to value offset
                    newExifData.set(newUserCommentBytes, userCommentEntryOffset + 8); // Insert new value
                    newExifData.set(app1Data.slice(userCommentEntryOffset + 8 + getUint32(userCommentEntryOffset + 4)), userCommentEntryOffset + 8 + newUserCommentBytes.length); // Copy rest
                    
                    // Update length in entry
                    const newExifDataView = new DataView(newExifData.buffer);
                    newExifDataView.setUint32(userCommentEntryOffset + 4, newUserCommentBytes.length, byteOrder === 'little');

                    // Reconstruct APP1 segment
                    const newApp1Length = newExifData.byteLength + 2; // +2 for marker length itself
                    const newApp1Segment = new Uint8Array(newApp1Length + 2); // +2 for FF E1
                    newApp1Segment[0] = 0xFF;
                    newApp1Segment[1] = 0xE1;
                    newApp1Segment[2] = (newApp1Length >> 8) & 0xFF;
                    newApp1Segment[3] = newApp1Length & 0xFF;
                    newApp1Segment.set(newExifData, 4);
                    segments[app1SegmentIndex] = newApp1Segment;

                } else {
                    // Add new UserComment entry (simplified, might need more robust IFD manipulation)
                    // This is a complex operation, for now, we'll just replace the whole APP1 segment
                    // if we can't find the UserComment tag.
                    // A more robust solution would involve resizing the IFD and data sections.
                    // For simplicity, if UserComment is not found, we'll just create a new APP1 segment.
                    const newApp1Segment = piexif.insert(piexif.dump({
                        "0th": {}, "Exif": { [userCommentTag]: newUserCommentBytes }, "GPS": {}, "Interop": {}, "1st": {}
                    }), arrayBufferToBinaryString(arrayBuffer));
                    segments[app1SegmentIndex] = new Uint8Array(binaryStringToArrayBuffer(newApp1Segment));
                }
            }
        } else {
            // No APP1 segment, create a new one (simplified)
            const newApp1Segment = piexif.insert(piexif.dump({
                "0th": {}, "Exif": { [userCommentTag]: newUserCommentBytes }, "GPS": {}, "Interop": {}, "1st": {}
            }), arrayBufferToBinaryString(arrayBuffer));
            segments.splice(1, 0, new Uint8Array(binaryStringToArrayBuffer(newApp1Segment))); // Insert after SOI
        }

        let totalLength = 0;
        for (const segment of segments) {
            totalLength += segment.byteLength;
        }
        const newArrayBuffer = new Uint8Array(totalLength);
        let currentOffset = 0;
        for (const segment of segments) {
            newArrayBuffer.set(segment, currentOffset);
            currentOffset += segment.byteLength;
        }
        return newArrayBuffer.buffer;
    }
};

const PngUtils = {
    // CRC32 table for PNG
    _crc32Table: (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) {
                if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
                else c = c >>> 1;
            }
            table[i] = c;
        }
        return table;
    })(),

    _crc32(buf) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ PngUtils._crc32Table[(crc ^ buf[i]) & 0xFF];
        }
        return crc ^ 0xFFFFFFFF;
    },

    parseChunks(arrayBuffer) {
        const chunks = [];
        const view = new DataView(arrayBuffer);
        let offset = 8; // Skip PNG signature

        while (offset < view.byteLength) {
            const length = view.getUint32(offset);
            const type = String.fromCharCode(
                view.getUint8(offset + 4), view.getUint8(offset + 5),
                view.getUint8(offset + 6), view.getUint8(offset + 7)
            );
            const data = new Uint8Array(arrayBuffer, offset + 8, length);
            const crc = view.getUint32(offset + 8 + length);

            chunks.push({ length, type, data, crc });
            offset += 12 + length; // 4 (length) + 4 (type) + length (data) + 4 (crc)
        }
        return chunks;
    },

    writePngMetadata(chunks, newMetadata, { retainExisting = false } = {}) {
        const encoder = new TextEncoder();
        const newChunks = [];
        let metadataWritten = false;

        // PNG signature
        newChunks.push(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));

        for (const chunk of chunks) {
            if (chunk.type === 'tEXt' || chunk.type === 'iTXt' || chunk.type === 'zTXt') {
                if (!retainExisting) continue; // Skip existing text chunks if not retaining
            }
            if (chunk.type === 'IEND') {
                // Insert new tEXt chunk before IEND
                if (!metadataWritten) {
                    const metadataString = JSON.stringify(newMetadata);
                    const key = encoder.encode('parameters');
                    const value = encoder.encode(metadataString);
                    const textData = new Uint8Array(key.length + 1 + value.length); // key + null separator + value
                    textData.set(key, 0);
                    textData.set([0], key.length);
                    textData.set(value, key.length + 1);

                    const textType = encoder.encode('tEXt');
                    const textLength = textData.length;
                    const textCrcBuf = new Uint8Array(textType.length + textData.length);
                    textCrcBuf.set(textType, 0);
                    textCrcBuf.set(textData, textType.length);
                    const textCrc = PngUtils._crc32(textCrcBuf);

                    const newTextChunk = new Uint8Array(12 + textLength);
                    const newTextView = new DataView(newTextChunk.buffer);
                    newTextView.setUint32(0, textLength);
                    newTextChunk.set(textType, 4);
                    newTextChunk.set(textData, 8);
                    newTextView.setUint32(8 + textLength, textCrc);
                    newChunks.push(newTextChunk);
                    metadataWritten = true;
                }
            }
            // Reconstruct original chunk
            const originalChunk = new Uint8Array(12 + chunk.length);
            const originalChunkView = new DataView(originalChunk.buffer);
            originalChunkView.setUint32(0, chunk.length);
            originalChunk.set(encoder.encode(chunk.type), 4);
            originalChunk.set(chunk.data, 8);
            originalChunkView.setUint32(8 + chunk.length, chunk.crc);
            newChunks.push(originalChunk);
        }

        let totalLength = 0;
        for (const chunk of newChunks) {
            totalLength += chunk.byteLength;
        }
        const newArrayBuffer = new Uint8Array(totalLength);
        let currentOffset = 0;
        for (const chunk of newChunks) {
            newArrayBuffer.set(chunk, currentOffset);
            currentOffset += chunk.byteLength;
        }
        return new Blob([newArrayBuffer.buffer], { type: 'image/png' });
    },

    editPngMetadata(arrayBuffer, newMetadata, options) {
        const chunks = PngUtils.parseChunks(arrayBuffer);
        return PngUtils.writePngMetadata(chunks, newMetadata, options);
    }
};

const WebpUtils = {
    editWebpUserComment(arrayBuffer, userComment) {
        // WebP metadata editing is complex and not directly supported by piexifjs.
        // This is a placeholder. A robust solution would involve parsing WebP chunks (RIFF, VP8X, EXIF, XMP, etc.)
        // and inserting/updating the appropriate metadata chunk.
        // For now, we'll return the original arrayBuffer and show a warning.
        console.warn('WebP metadata editing is not fully implemented.');
        return new Blob([arrayBuffer], { type: 'image/webp' });
    }
};


/* --- LinuxModalManager --- */
class LinuxModalManager {
    constructor(opts={}) {
        this.root = $('ref-popup') || this._injectPopup();
        this.header = this.root.querySelector('.ref-header');
        this.img = this.root.querySelector('#ref-image');
        this.titleEl = this.root.querySelector('#ref-title');

        // button references & handlers
        this.closeBtn = null; this.fullBtn = null; this.hideBtn = null;
        this._closeHandler = null; this._fullHandler = null; this._hideHandler = null;
        this._keyHandler = null;

        this.isFullscreen = false;
        this.isMinimized = false;
        this.currentSrc = null;

        // expose for debugging
        try { window._metadataModalManager = this; } catch(e){}

        this._setupControls();
        this._setupDrag();
        this._setupImagePan();
    }

    _injectPopup() {
        const wrapper = document.createElement('div');
        wrapper.id = 'ref-popup';
        wrapper.className = 'ref-popup hidden';
        wrapper.setAttribute('role','dialog');
        wrapper.setAttribute('aria-hidden','true');
        wrapper.innerHTML = `
            <div class="ref-header" id="ref-header" title="Drag to move">
                <div class="win-controls">
                    <button id="ref-close" class="control red" title="Close"></button>
                    <button id="ref-full" class="control yellow" title="Fullscreen"></button>
                    <button id="ref-hide" class="control green" title="Minimize"></button>
                </div>
                <div class="ref-title" id="ref-title">Reference</div>
            </div>
            <div class="ref-body" id="ref-body">
                <img id="ref-image" alt="Reference" draggable="false">
            </div>
        `;
        document.body.appendChild(wrapper);
        return wrapper;
    }

    _setupControls() {
        // Remove previous handlers if any
        try {
            if (this.closeBtn && this._closeHandler) this.closeBtn.removeEventListener('click', this._closeHandler);
            if (this.fullBtn && this._fullHandler) this.fullBtn.removeEventListener('click', this._fullHandler);
            if (this.hideBtn && this._hideHandler) this.hideBtn.removeEventListener('click', this._hideHandler);
            if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
        } catch(e) {}

        // Re-query buttons inside the popup root to ensure correct nodes
        this.closeBtn = this.root.querySelector('#ref-close');
        this.fullBtn = this.root.querySelector('#ref-full');
        this.hideBtn = this.root.querySelector('#ref-hide');

        // Create fresh handlers and bind
        if (this.closeBtn) {
            this._closeHandler = (e) => { e && e.stopPropagation(); this.close(); };
            this.closeBtn.addEventListener('click', this._closeHandler);
        }
        if (this.fullBtn) {
            this._fullHandler = (e) => { e && e.stopPropagation(); this.toggleFullscreen(); };
            this.fullBtn.addEventListener('click', this._fullHandler);
        }
        if (this.hideBtn) {
            this._hideHandler = (e) => { e && e.stopPropagation(); this.toggleMinimize(); };
            this.hideBtn.addEventListener('click', this._hideHandler);
        }

        // keyboard shortcuts (single global handler)
        this._keyHandler = (e) => {
            if (e.key === 'Escape') { this.close(); }
            if (e.key === 'F11' || e.key === '9') { e.preventDefault(); this.toggleFullscreen(); }
            // quick minimize on 'd' or 'D' without modifiers
            if ((e.key === 'd' || e.key === 'D') && !e.altKey && !e.ctrlKey && !e.metaKey) {
                this.toggleMinimize();
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    }

    _setupDrag() {
        if (!this.header) this.header = this.root.querySelector('.ref-header');
        if (!this.header) return;
        let dragging=false, startX=0, startY=0, startLeft=0, startTop=0;
        this.header.addEventListener('pointerdown', (e) => {
            // If the pointerdown started on a control button, don't initiate a drag
            if (e.target && e.target.closest && e.target.closest('.control')) return;
            dragging = true;
            startX = e.clientX; startY = e.clientY;
            const rect = this.root.getBoundingClientRect();
            startLeft = rect.left; startTop = rect.top;
            try { this.header.setPointerCapture(e.pointerId); } catch(_) {}
            this.root.style.transition = 'none';
        });
        window.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            this.root.style.left = (startLeft + dx) + 'px';
            this.root.style.top = (startTop + dy) + 'px';
            this.root.classList.remove('fullscreen');
        });
        window.addEventListener('pointerup', (e) => {
            dragging = false;
            try { this.header.releasePointerCapture(e.pointerId); } catch(_) {}
            this.root.style.transition = '';
        });
    }

    _setupImagePan() {
        if (!this.img) this.img = this.root.querySelector('#ref-image');
        if (!this.img) return;
        let scale=1, posX=0, posY=0, dragging=false, last={x:0,y:0}, start={x:0,y:0};
        const apply = () => { this.img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`; };
        this.img.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = -e.deltaY;
            const factor = delta > 0 ? 1.08 : 0.92;
            scale = clamp(scale * factor, 0.25, 8);
            apply();
        }, {passive:false});
        this.img.addEventListener('pointerdown', (e) => {
            dragging = true;
            start.x = e.clientX - last.x;
            start.y = e.clientY - last.y;
            try { this.img.setPointerCapture(e.pointerId); } catch(_) {}
            this.img.classList.add('grabbing');
        });
        window.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            posX = e.clientX - start.x;
            posY = e.clientY - start.y;
            last.x = posX; last.y = posY;
            apply();
        });
        window.addEventListener('pointerup', (e) => {
            dragging = false;
            try { this.img.releasePointerCapture(e.pointerId); } catch(_) {}
            this.img.classList.remove('grabbing');
        });
        this.resetView = () => { scale = 1; posX = 0; posY = 0; last = {x:0,y:0}; apply(); };
    }

    show(src, title='Reference') {
        if (!this.img) this.img = this.root.querySelector('#ref-image');
        if (src && this.img) this.img.src = src;
        if (this.titleEl) this.titleEl.textContent = title;
        this.root.classList.remove('hidden', 'minimized');
        this.root.setAttribute('aria-hidden','false');
        if (this.resetView) this.resetView();
        this.currentSrc = src;
        // Re-bind controls in case DOM nodes were re-rendered or injected later
        setTimeout(()=> this._setupControls(), 0);
    }

    hide() {
        this.root.classList.add('hidden');
        this.root.setAttribute('aria-hidden','true');
    }

    toggleMinimize() {
        this.root.classList.toggle('minimized');
        this.isMinimized = this.root.classList.contains('minimized');
    }

    async toggleFullscreen() {
        try {
            if (!this.isFullscreen) {
                if (this.root.requestFullscreen) await this.root.requestFullscreen();
                this.root.classList.add('fullscreen');
                this.isFullscreen = true;
            } else {
                if (document.exitFullscreen) await document.exitFullscreen();
                this.root.classList.remove('fullscreen');
                this.isFullscreen = false;
            }
        } catch(e) {
            console.warn('Fullscreen toggle failed', e);
        }
    }

    close() {
        this.hide();
        try { document.dispatchEvent(new CustomEvent('ref-popup-closed', { detail: { src: this.currentSrc } })); } catch(e){}
    }
}

/* --- DashboardRenderer --- */
class DashboardRenderer {
    constructor() {}

    renderView(metadata) {
        const promptEl = $('prompt');
        const negEl = $('negative-prompt');
        const paramsEl = $('parameters-table');
        if (promptEl) promptEl.textContent = metadata.prompt || '';
        if (negEl) negEl.textContent = metadata.negative || '';
        if (paramsEl) paramsEl.innerHTML = '';

        const params = Array.isArray(metadata.parameters) ? metadata.parameters.slice() : [];
        const map = metadata.paramsMap || parseParametersStringToObject(params.join(', '));
        const combinedText = (metadata.prompt || '') + '\n' + params.join('\n');
        const loras = parseLorasFromText(combinedText);
        this._addParamRow(paramsEl, 'LoRAs', loras.length ? loras.join(', ') : 'N/A');
        const checkpoint = extractCheckpointFromParams(map, metadata);
        this._addParamRow(paramsEl, 'Checkpoint', checkpoint || 'N/A');

        const common = ['Steps','Sampler','CFG scale','Seed','Size','Model','Model hash','Checkpoint','sd_model_checkpoint'];
        const shown = new Set();
        common.forEach(k => {
            if (map[k]) { this._addParamRow(paramsEl, k, map[k]); shown.add(k); }
        });
        Object.keys(map).forEach(k => { if (!shown.has(k)) this._addParamRow(paramsEl, k, map[k]); });
        params.forEach(p => { if (!p.includes(':')) this._addParamRow(paramsEl, 'Other', p); });
    }

    _addParamRow(container, name, value) {
        if (!container) return;
        const row = document.createElement('div'); row.className = 'param-row';
        const nameCell = document.createElement('div'); nameCell.className = 'param-name'; nameCell.textContent = name + ':';
        const valCell = document.createElement('div'); valCell.className = 'param-value';
        if (Array.isArray(value)) valCell.textContent = value.join(', ');
        else if (typeof value === 'string') {
            try {
                const js = JSON.parse(value);
                const pre = document.createElement('pre');
                pre.textContent = JSON.stringify(js, null, 2);
                valCell.appendChild(pre);
            } catch(e) {
                valCell.textContent = value;
            }
        } else if (value !== undefined && value !== null) {
            valCell.textContent = String(value);
        }
        row.appendChild(nameCell); row.appendChild(valCell);
        container.appendChild(row);
    }

    renderEdit(metadata) {
        const editPrompt = $('edit-prompt'), editNeg = $('edit-negative-prompt'), editParams = $('edit-parameters');
        if (!editPrompt || !editNeg || !editParams) return;
        editParams.innerHTML = '';
        editPrompt.value = metadata.prompt || '';
        editNeg.value = metadata.negative || '';
        const map = metadata.paramsMap || parseParametersStringToObject((metadata.parameters || []).join(', '));
        Object.keys(map).forEach(key => this._createParamEditor(editParams, key, map[key]));
        const addBtn = document.createElement('button'); addBtn.className = 'discord-btn'; addBtn.textContent = 'Add Parameter';
        addBtn.addEventListener('click', () => this._createParamEditor(editParams, '', ''));
        editParams.appendChild(addBtn);
    }

    _createParamEditor(container, key='', value='') {
        const row = document.createElement('div'); row.className = 'param-edit-row';
        const keyInput = document.createElement('input'); keyInput.type = 'text'; keyInput.className = 'param-edit-input'; keyInput.value = key || ''; keyInput.placeholder = 'key'; keyInput.style.width = '30%';
        const valInput = document.createElement('input'); valInput.type = 'text'; valInput.className = 'param-edit-input'; valInput.value = value || ''; valInput.placeholder = 'value'; valInput.style.width = '60%';
        const del = document.createElement('button'); del.className = 'discord-btn'; del.textContent = 'Delete'; del.style.marginLeft = '8px';
        del.addEventListener('click', () => row.remove());
        row.appendChild(keyInput); row.appendChild(valInput); row.appendChild(del);
        container.appendChild(row);
    }

    renderLoRA(metadata) {
        if (!metadata) return;
        const setText = (id, v) => {
            const el = $(id);
            if (!el) return;

            const parentRow = el.closest('.param-row');
            if (!parentRow) return;

            // Check for "N/A" conditions
            const isNA = (v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && Object.keys(v).length === 0));

            if (isNA) {
                parentRow.style.display = 'none'; // Hide the entire row
                return;
            } else {
                parentRow.style.display = ''; // Ensure it's visible if it has content
            }

            let formattedValue = ''; // Initialize formattedValue

            try { // Add a try-catch block around the formatting logic
                if (Array.isArray(v)) {
                    if (id === 'dataset-info') {
                        formattedValue = v.map(ds => {
                            const parts = [];
                            if (ds.path) parts.push(`Path: ${ds.path}`);
                            if (ds.img_count) parts.push(`Images: ${ds.img_count}`);
                            return parts.join(' ');
                        }).join('; ');
                    } else if (id === 'suggested-prompt') {
                        formattedValue = v.join(', ');
                    } else {
                        formattedValue = v.join(', ');
                    }
                } else if (typeof v === 'object') {
                    if (id === 'tag-frequency') {
                        formattedValue = Object.entries(v).map(([tag, count]) => `${tag}: ${count}`).join(', ');
                    } else if (id === 'suggested-prompt') {
                        // Ensure v is iterable for Object.values
                        if (v && typeof v === 'object' && !Array.isArray(v)) {
                            formattedValue = Object.values(v).join(', ');
                        } else {
                            formattedValue = String(v); // Fallback if not a plain object
                        }
                    } else {
                        formattedValue = JSON.stringify(v, null, 2);
                    }
                } else {
                    formattedValue = String(v);
                }
            } catch (formatError) {
                console.error(`Error formatting value for ID "${id}":`, formatError);
                formattedValue = String(v); // Fallback to string conversion on error
            }
            el.textContent = formattedValue;
        };
        const md = metadata.lora || metadata || {}; // md will now contain the full metadata
        
        // Map keys to ss_ prefixed values as observed in lora_view.html
        setText('model-name', md.ss_output_name || md.ss_model_name || md.model || md.name);
        setText('base-model', md.ss_sd_model_name || md.base_model || md.base);
        setText('model-vae', md.ss_vae_name || md.vae);
        setText('batch-size', md.ss_total_batch_size || (md.ss_datasets && md.ss_datasets[0]?.batch_size_per_device) || md.batch || md.batch_size);
        setText('resolution', md.ss_resolution || md.resolution || md.res);
        setText('clip-skip', md.ss_clip_skip || md.clip_skip);
        setText('epoch', (md.ss_epoch || md.ss_num_epochs) ? ((md.ss_epoch || '') + (md.ss_num_epochs ? ` of ${md.ss_num_epochs}` : '')) : undefined);
        setText('steps', (md.ss_steps || md.ss_max_train_steps) ? ((md.ss_steps || '') + (md.ss_max_train_steps ? ` of ${md.ss_max_train_steps}` : '')) : undefined);
        
        // Optimizer
        let optimizerType = md.ss_optimizer;
        if (optimizerType && typeof optimizerType === 'string') {
            const match = optimizerType.match(/\b(\w+)\b(?=\s*\()|\b(\w+)\b$/);
            if (match) optimizerType = match[1] || match[2];
        }
        setText('optimizer-type', optimizerType || md.optimizer);
        setText('scheduler', md.ss_lr_scheduler || md.scheduler);
        setText('learning-rates', `LR: ${md.ss_learning_rate || ''} TE: ${md.ss_text_encoder_lr || ''} UNET: ${md.ss_unet_lr || ''}`);
        
        let optionalArgs = '';
        if (md.ss_optimizer && typeof md.ss_optimizer === 'string' && md.ss_optimizer.indexOf('(') > 0) {
            const argsString = md.ss_optimizer.slice(md.ss_optimizer.indexOf('(') + 1, -1);
            try {
                // Robust parsing for key=value pairs, handling nested parentheses
                const regex = /(\w+)=((?:[^,()]+|\([^()]*\))+)/g;
                let match;
                const parsedArgs = {};
                while ((match = regex.exec(argsString)) !== null) {
                    parsedArgs[match[1]] = match[2];
                }
                optionalArgs = Object.entries(parsedArgs).map(([key, value]) => `${key}: ${value}`).join(', ');
            } catch (e) {
                optionalArgs = argsString; // Fallback to raw string if parsing fails
            }
        }
        setText('optional-args', optionalArgs || md.optimizer_args);

        // Training Info
        let trainDate, trainTime;
        if (md.ss_training_started_at) {
            const startDate = new Date(md.ss_training_started_at * 1000);
            trainDate = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            if (md.ss_training_finished_at) {
                const endDate = new Date(md.ss_training_finished_at * 1000);
                const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
                const diffH = Math.floor(diffMs / (1000 * 60 * 60));
                const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                const diffS = Math.floor((diffMs % (1000 * 60)) / 1000);
                trainTime = `${diffH}h ${diffM}m ${diffS}s`;
            }
        }
        setText('train-date', trainDate || md.train_date);
        setText('train-time', trainTime || md.train_time);

        // Dataset
        const datasetInfoEl = $('lora-dataset-info');
        if (datasetInfoEl) {
            let nRepeats = 0;
            let imgCount = 0;

            if (md.ss_dataset_dirs) {
                try {
                    const parsedDatasetDirs = JSON.parse(md.ss_dataset_dirs);
                    if (parsedDatasetDirs.dataset) {
                        nRepeats = parsedDatasetDirs.dataset.n_repeats || 0;
                        imgCount = parsedDatasetDirs.dataset.img_count || 0;
                    }
                } catch (e) {
                    console.error("Error parsing ss_dataset_dirs:", e);
                }
            }

            const datasetInfo = {
                dataset: {
                    n_repeats: nRepeats,
                    img_count: imgCount
                }
            };
            datasetInfoEl.textContent = JSON.stringify(datasetInfo, null, 2);
        }
        
        // Suggested Prompt and Tag Frequency
        setText('suggested-prompt', md.ss_prompt || md.prompt || md.suggested_prompt);
        
        // Correctly handle tag frequency display
        const tagFrequencyEl = $('tag-frequency');
        if (tagFrequencyEl) {
            let tagFrequencyData = md.ss_tag_frequency || md.tag_frequency || md.tags;

            // If it's a string, try to parse it as JSON
            if (typeof tagFrequencyData === 'string') {
                try {
                    tagFrequencyData = JSON.parse(tagFrequencyData);
                } catch (e) {
                    // If parsing fails, treat it as a plain string or empty object
                    tagFrequencyData = {};
                }
            }

            if (tagFrequencyData && typeof tagFrequencyData === 'object') {
                let tagsHtml = '';
                const extractTags = (obj) => {
                    for (const key in obj) {
                        if (Object.hasOwnProperty.call(obj, key)) {
                            const value = obj[key];
                            if (typeof value === 'object' && value !== null) {
                                extractTags(value); // Recurse
                            } else {
                                // Remove "img." prefix if present
                                let displayKey = key;
                                if (displayKey.startsWith('img.')) {
                                    displayKey = displayKey.substring(4); // Remove "img."
                                }
                                tagsHtml += `
                                    <div class="tag-item">
                                        <span class="tag-text">${displayKey}: ${value}</span>
                                        <button class="copy-tag-btn" data-tag-value="${displayKey}" title="Copy">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                                                <path d="M4 1.5H3a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-11a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h1v-1z"/>
                                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                                            </svg>
                                        </button>
                                    </div>
                                `;
                            }
                        }
                    }
                };
                extractTags(tagFrequencyData);
                tagFrequencyEl.innerHTML = tagsHtml;

                // Add event listeners for copy buttons
                tagFrequencyEl.querySelectorAll('.copy-tag-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        const tagValue = button.getAttribute('data-tag-value');
                        navigator.clipboard.writeText(tagValue).then(() => {
                            showToast('Copied!', 'success', 1000);
                        }).catch(err => {
                            console.error('Error copying tag: ', err);
                            showToast('Failed to copy tag.', 'error', 1000);
                        });
                    });
                });

            } else {
                tagFrequencyEl.textContent = 'N/A';
            }
        }
        
        const loraResults = $('lora-results');
        if (loraResults) loraResults.classList.remove('hidden');
    }
}

/* --- ImageMetadataEditor --- */
class ImageMetadataEditor {
    constructor() {
        this.parser = MetadataParser;
        this.modal = new LinuxModalManager();
        this.dashboard = new DashboardRenderer();
        this.cache = new Map();
        this.currentFile = null;
        this.currentParsed = null;
        this.undoStack = [];
        this.redoStack = [];
        this.currentObjectURL = null;
        this._bindElements();
        this._wireEvents();
        window.addEventListener('beforeunload', () => this._revokeCurrentURL());
        document.addEventListener('ref-popup-closed', () => this._revokeCurrentURL());
    }

    _bindElements() {
        this.dropArea = $('drop-area');
        this.editDropArea = $('edit-drop-area');
        this.loraDropArea = $('lora-drop-area');
        this.resultsDiv = $('results');
        this.promptPre = $('prompt');
        this.negativePre = $('negative-prompt');
        this.parametersTable = $('parameters-table');
        this.editPrompt = $('edit-prompt');
        this.editNegative = $('edit-negative-prompt');
        this.editParameters = $('edit-parameters');
        this.saveBtn = $('save-changes');
        this.notification = $('notification');
        this.editNotification = $('edit-notification');
        this.channels = document.querySelectorAll('.channel');
    }

    _wireEvents() {
        // Setup server switching
        document.querySelectorAll('.server').forEach(server => {
            server.addEventListener('click', (e) => {
                const title = server.getAttribute('title');
                if (title === 'Stable Diffusion') {
                    e.preventDefault();
                    e.stopPropagation();
                    // Switch to Stable Diffusion server
                    this._switchServer('sd');
                } else if (title === 'Metadata Image') {
                    e.preventDefault();
                    e.stopPropagation();
                    // Switch to Metadata server
                    this._switchServer('metadata');
                }
            });
        });

        document.querySelectorAll('.channel').forEach(c => {
            c.addEventListener('click', (e) => {
                document.querySelectorAll('.channel').forEach(cc => cc.classList.remove('active'));
                c.classList.add('active');
                const tabName = c.dataset.tab;
                if (!tabName) return;
                document.querySelectorAll('.tab-content').forEach(t => { t.classList.remove('active'); t.classList.add('hidden'); });
                const id = `${tabName}-tab`;
                const tab = $(id);
                if (tab) { tab.classList.add('active'); tab.classList.remove('hidden'); }
                
                // Reset dataset view when entering dataset tab
                if (tabName === 'dataset' && window._datasetCreator) {
                    window._datasetCreator.goToStep(1);
                }
                
                // Initialize SD settings when entering sd-settings tab
                if (tabName === 'sd-settings' && window._tunnelManager) {
                    window._tunnelManager.updateElements();
                    window._tunnelManager.setupEventListeners();
                }
            });
        });

        this._setupDropZone(this.dropArea, file => this._onFileOpen(file, 'view'));
        this._setupDropZone(this.editDropArea, file => this._onFileOpen(file, 'edit'));
        this._setupDropZone(this.loraDropArea, file => this._onLoraOpen(file));

        if (this.dropArea) this.dropArea.addEventListener('click', () => this._openFilePicker('image', 'view'));
        if (this.editDropArea) this.editDropArea.addEventListener('click', () => this._openFilePicker('image', 'edit'));
        if (this.loraDropArea) this.loraDropArea.addEventListener('click', () => this._openFilePicker('safetensors', 'lora'));

        if (this.saveBtn) this.saveBtn.addEventListener('click', () => this._saveEditedImage());

        if (this.editPrompt) this.editPrompt.addEventListener('input', () => this._applyLiveEdits());
        if (this.editNegative) this.editNegative.addEventListener('input', () => this._applyLiveEdits());
        if (this.editParameters) {
            this.editParameters.addEventListener('input', (e) => {
                if (e.target && e.target.closest('.param-edit-row')) this._applyLiveEdits();
            });
        }
    }

    _switchServer(serverType) {
        const metadataList = document.getElementById('metadata-channel-list');
        const sdList = document.getElementById('sd-channel-list');
        const servers = document.querySelectorAll('.server');
        
        if (serverType === 'sd') {
            // Switch to Stable Diffusion server
            if (metadataList) {
                metadataList.classList.add('hidden');
                metadataList.style.display = 'none';
            }
            if (sdList) {
                sdList.classList.remove('hidden');
                sdList.style.display = 'flex';
            }
            servers.forEach(s => {
                if (s.getAttribute('title') === 'Stable Diffusion') {
                    s.classList.add('active');
                } else if (s.getAttribute('title') === 'Metadata Image') {
                    s.classList.remove('active');
                }
            });
            // Click the first SD channel
            const firstChannel = document.querySelector('[data-tab="sd-txt2img"]');
            if (firstChannel) firstChannel.click();
        } else if (serverType === 'metadata') {
            // Switch to Metadata server
            if (metadataList) {
                metadataList.classList.remove('hidden');
                metadataList.style.display = 'flex';
            }
            if (sdList) {
                sdList.classList.add('hidden');
                sdList.style.display = 'none';
            }
            servers.forEach(s => {
                if (s.getAttribute('title') === 'Metadata Image') {
                    s.classList.add('active');
                } else if (s.getAttribute('title') === 'Stable Diffusion') {
                    s.classList.remove('active');
                }
            });
            // Click the first metadata channel
            const firstChannel = document.querySelector('[data-tab="view"]');
            if (firstChannel) firstChannel.click();
        }
    }

    _setupDropZone(el, handler) {
        if (!el) return;
        const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter','dragover','dragleave','drop'].forEach(ev => el.addEventListener(ev, prevent, {passive:false}));
        el.addEventListener('dragenter', () => el.classList.add('highlight'));
        el.addEventListener('dragover', () => el.classList.add('highlight'));
        el.addEventListener('dragleave', () => el.classList.remove('highlight'));
        el.addEventListener('drop', (e) => {
            el.classList.remove('highlight');
            const dt = e.dataTransfer; if (!dt) return;
            if (dt.files && dt.files.length) {
                const files = Array.from(dt.files);
                for (const f of files) { handler(f); break; }
            }
        });
    }

    _openFilePicker(kind='image', mode='view') {
        const input = document.createElement('input');
        input.type = 'file';
        if (kind === 'image') input.accept = 'image/png,image/jpeg,image/jpg,image/webp';
        else if (kind === 'safetensors') input.accept = '.safetensors';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                if (mode === 'view') this._onFileOpen(e.target.files[0], 'view');
                else if (mode === 'edit') this._onFileOpen(e.target.files[0], 'edit');
                else if (mode === 'lora') this._onLoraOpen(e.target.files[0]);
            }
            setTimeout(()=> input.remove(), 200);
        });
        input.click();
    }

    _revokeCurrentURL() {
        if (this.currentObjectURL) {
            try { URL.revokeObjectURL(this.currentObjectURL); } catch(_) {}
            this.currentObjectURL = null;
        }
    }

    async _onFileOpen(file, mode='view') {
        if (!file) return;
        const name = (file.name || '').toLowerCase();
        if (!name.match(/\.(png|jpe?g|webp)$/)) {
            showToast('Unsupported file format. Use PNG, JPG, JPEG or WEBP.', 'error');
            return;
        }
        this._revokeCurrentURL();
        this.currentFile = file;
        const src = URL.createObjectURL(file);
        this.currentObjectURL = src;
        this.modal.show(src, file.name || 'Reference');
        try {
            const metadata = await this.parser.parseFile(file);
            this.currentParsed = metadata;
            if (this.resultsDiv) this.resultsDiv.classList.remove('hidden');
            this.dashboard.renderView(metadata);
            if (mode === 'edit') this.dashboard.renderEdit(metadata);
        } catch (err) {
            console.error(err);
            showToast('Error parsing file: ' + (err.message || err), 'error');
        }
    }

    async _onLoraOpen(file) {
        if (!file) return;
        const name = (file.name || '').toLowerCase();
        if (!name.endsWith('.safetensors')) {
            showToast('Unsupported file format. Use .safetensors for LoRA files.', 'error');
            return;
        }
        this._revokeCurrentURL();
        this.currentFile = file;
        try {
            const metadata = await this.parser.parseFile(file);
            this.currentParsed = metadata;
            this.dashboard.renderLoRA(metadata);
        } catch (err) {
            console.error(err);
            showToast('Error parsing LoRA file: ' + (err.message || err), 'error');
        }
    }

    _applyLiveEdits() {
        if (!this.currentParsed) return;
        if (this.editPrompt) this.currentParsed.prompt = this.editPrompt.value;
        if (this.editNegative) this.currentParsed.negative = this.editNegative.value;
        const newParams = [];
        if (this.editParameters) {
            const rows = this.editParameters.querySelectorAll('.param-edit-row');
            rows.forEach(row => {
                const inputs = row.querySelectorAll('input.param-edit-input');
                if (inputs.length === 2) {
                    const key = inputs[0].value.trim();
                    const val = inputs[1].value.trim();
                    if (key) newParams.push(`${key}: ${val}`);
                } else if (inputs.length === 1) {
                    const val = inputs[0].value.trim();
                    if (val) newParams.push(val);
                }
            });
        }
        this.currentParsed.parameters = newParams;
        this.currentParsed.paramsMap = parseParametersStringToObject(newParams.join(', '));
        this.dashboard.renderView(this.currentParsed);
    }

    async _saveEditedImage() {
        if (!this.currentParsed || !this.currentFile) return;

        const name = (this.currentFile.name || '').toLowerCase();
        const baseName = name.replace(/\.(png|jpe?g|webp)$/, '');

        // Construct A1111-like metadata string
        let metadataString = this.currentParsed.prompt || '';
        if (this.currentParsed.negative) {
            metadataString += `\nNegative prompt: ${this.currentParsed.negative}`;
        }
        if (this.currentParsed.parameters && this.currentParsed.parameters.length > 0) {
            metadataString += `\n${this.currentParsed.parameters.join(', ')}`;
        }

        let modifiedBlob;

        try {
            const arrayBuffer = await readAsArrayBuffer(this.currentFile);
            const fileType = await ImageMetadataUtils.getImageTypeFromBinarySignature(this.currentFile);

            if (fileType === 'image/jpeg') {
                modifiedBlob = new Blob([JpgUtils.editJPEGUserComment(arrayBuffer, metadataString)], { type: fileType });
            } else if (fileType === 'image/png') {
                // For PNG, we need to pass the metadata as an object to editPngMetadata
                const newMetadata = { parameters: metadataString };
                modifiedBlob = PngUtils.editPngMetadata(arrayBuffer, newMetadata, { retainExisting: false }); // retainExisting: false for now
            } else if (fileType === 'image/webp') {
                showToast('WEBP metadata editing is not supported.', 'error');
                return;
            } else {
                showToast('Unsupported file format for metadata editing.', 'error');
                return;
            }

            // Download the modified image
            if (modifiedBlob) {
                downloadBlob(modifiedBlob, `${baseName}_edited.${fileType.split('/')[1]}`);
                showToast('Image metadata updated and downloaded!', 'success');
            }

        } catch (error) {
            console.error('Error saving edited image:', error);
            showToast('Error saving edited image: ' + (error.message || error), 'error');
        }
    }
}

// Dataset Creator - Full implementation from dataset_creator.html
// Global Variables
let images = [];
let currentPage = 1;
const imagesPerPage = 9;
let selectedTags = new Set();
let tagViewerCollapsed = false;
let wildcards = {}; // {category: [tags]}
let autocompleteDropdown = null;

class DatasetCreator {
    constructor() {
        console.log('[DatasetCreator] Initializing...');
        this.init();
        console.log('[DatasetCreator] Initialized successfully');
    }

    init() {
        // Initialize tokens from embedded top tags (GitHub Pages compatible)
        this.tokens = [
            'mammal','anthro','hi_res','female','male','solo','genitals','clothing','hair','fur','breasts','duo','penis','tail','bodily_fluids',
            'digital_media_(artwork)','canid','nipples','canine','simple_background','nude','text','clothed','absurd_res','balls','smile',
            'butt','genital_fluids','sex','blush','open_mouth','looking_at_viewer','vulva','erection','english_text','big_breasts','tongue',
            'penetration','teeth','white_body','canis','felid','cum','male/female','horn','mythology','scalie','penile','mythological_creature',
            'feet','feline','anus','size_difference','human','humanoid','day','night','morning','evening','nature','plant','grass','forest',
            'water','beach','urban','desert','sky','cloud','snow','rain','mountain','hill','cave','building','house','room','bedroom','kitchen',
            'bathroom','indoor','outdoor','landscape','scenery','furniture','table','chair','bed','couch','desk','lamp','window','door','wall',
            'floor','ceiling','roof','street','road','alley','bridge','river','lake','ocean','sea','pond','pool','waterfall','fountain','park',
            'garden','tree','flower','grass','rock','sand','dirt','wood','metal','stone','glass','plastic','fabric','paper','leather','weapon',
            'sword','gun','rifle','pistol','bow','arrow','knife','spear','shield','armor','helmet','glove','boot','cape','cloak','robe','dress',
            'shirt','pants','shorts','skirt','jacket','coat','hat','scarf','belt','ring','necklace','bracelet','earring','tattoo','scar','piercing',
            'makeup','lipstick','eyeshadow','jewelry','crown','tiara','mask','glasses','sunglasses','contact_lens','eye_patch','monocle','goggle',
            'helmet','crown','turban','bandana','beanie','beret','cowboy_hat','top_hat','military_cap','sailor_cap','chef_hat','witch_hat','santa_hat',
            'party_hat','graduation_cap','police_hat','firefighter_hat','construction_hat','baseball_cap','basketball_cap','football_helmet','race_helmet',
            'motorcycle_helmet','bicycle_helmet','scuba_mask','gas_mask','surgical_mask','plague_doctor_mask','animal_ears','cat_ears','dog_ears','fox_ears',
            'wolf_ears','horse_ears','rabbit_ears','mouse_ears','pig_ears','cow_ears','sheep_ears','goat_ears','deer_ears','elf_ears','fairy_wings',
            'angel_wings','demon_wings','bat_wings','insect_wings','dragon_wings','feathered_wings','scaled_wings','mechanical_wings','magical_aura',
            'glowing_effect','sparkle_effect','fire_effect','ice_effect','electricity_effect','water_effect','wind_effect','smoke_effect','fog_effect',
            'cloud_effect','rain_effect','snow_effect','lightning_effect','explosion_effect','dust_effect','blood_effect','tear_effect','sweat_effect',
            'saliva_effect','shine_effect','glow_effect','shadow_effect','reflection_effect','transparency_effect','gradient_effect','gradient',
            'color_gradient','rainbow_gradient','sunset_gradient','color','red','blue','green','yellow','orange','purple','pink','brown','black','white',
            'gray','grey','monochrome','grayscale','sepia','vintage','faded','saturated','vivid','muted','pale','bright','dark','light','warm','cool'
        ];

        // Loading Functions
        window.showLoadingInfo = (text) => {
            const el = $('loadingText');
            if (el) el.textContent = text;
            const overlay = $('loadingOverlay');
            if (overlay) overlay.classList.add('active');
        };

        window.hideLoadingInfo = () => {
            const overlay = $('loadingOverlay');
            if (overlay) overlay.classList.remove('active');
        };

        // Upload Area Setup
        const uploadArea = $('uploadArea');
        const imageInput = $('imageInput');

        if (uploadArea && imageInput) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;

                const zipFiles = Array.from(files).filter(f => f.name.endsWith('.zip'));
                const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

                if (zipFiles.length > 0) {
                    this.handleZipFile(zipFiles[0]);
                } else if (imageFiles.length > 0) {
                    this.handleFiles(files);
                }
            });

            uploadArea.addEventListener('click', () => {
                imageInput.click();
            });

            imageInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                const zipFiles = files.filter(f => f.name.endsWith('.zip') || f.type === 'application/zip');
                const imageFiles = files.filter(f => f.type.startsWith('image/'));

                if (zipFiles.length > 0) {
                    this.handleZipFile(zipFiles[0]);
                } else if (imageFiles.length > 0) {
                    this.handleFiles(e.target.files);
                }
            });
        }

        // Inspector setup
        const inspectorImageContainer = $('inspector-image-container');
        const inspectorImageInput = $('inspector-image-input');
        const inspectorSaveBtn = $('inspector-save-tags');

        if (inspectorImageContainer && inspectorImageInput) {
            inspectorImageContainer.addEventListener('click', () => inspectorImageInput.click());
            inspectorImageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.name && file.name.toLowerCase().endsWith('.zip')) {
                    // use existing zip handler to import images into dataset
                    this.handleZipFile(file);
                } else {
                    this.handleInspectorImage(file);
                }
            });

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                inspectorImageContainer.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            inspectorImageContainer.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleInspectorImage(files[0]);
                }
            });
        }

        if (inspectorSaveBtn) {
            inspectorSaveBtn.addEventListener('click', () => this.saveInspectorTags());
        }

        // Wildcard autocomplete setup
        this.wildcards = {};
        this.tokens = []; // flat token list from CSV + txt files
        // load built-in CSV (if present) and optional txt wildcards
        this.loadBuiltInCSV('e621_2025-11-02_pt20-ia-ed.csv').then(()=>{
            this.setupAutocomplete();
        }).catch(()=>{
            this.setupAutocomplete();
        });
    }

    setupWildcardLoader() {
        // Deprecated manual loader - keep for compatibility if element exists
        const wildcardFileInput = $('wildcard-file-input');
        if (!wildcardFileInput) return;
        wildcardFileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            for (const file of files) {
                try {
                    const text = await readAsText(file);
                    const name = (file.name || '').toLowerCase().replace(/\.(txt|csv)$/,'');
                    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).filter(l=>!l.startsWith('#'));
                    if (lines.length) this.wildcards[name] = lines;
                } catch (err) {
                    console.error('Error reading wildcard file:', err);
                }
            }
            this.updateWildcardList();
            this.rebuildTokenIndex();
            wildcardFileInput.value = '';
        });
    }

    async loadBuiltInCSV(filename) {
        try {
            const resp = await fetch(filename);
            if (!resp.ok) throw new Error('CSV not found');
            const text = await resp.text();
            // parse CSV: split on non-word characters and commas
            const tokens = new Set();
            text.split(/\r?\n/).forEach(line => {
                // simple CSV - take first column or whole line
                const cols = line.split(',');
                if (cols.length) {
                    const token = cols[0].trim();
                    if (token) tokens.add(token);
                }
            });
            this.tokens = Array.from(tokens);
            console.log('[DatasetCreator] Loaded built-in CSV tokens:', this.tokens.length);
            return true;
        } catch (err) {
            console.warn('[DatasetCreator] Built-in CSV not loaded:', err.message);
            return false;
        }
    }

    rebuildTokenIndex() {
        // Flatten wildcards into tokens array
        const t = new Set(this.tokens || []);
        for (const k of Object.keys(this.wildcards || {})) {
            (this.wildcards[k]||[]).forEach(tag => t.add(tag));
        }
        this.tokens = Array.from(t);
    }

    updateWildcardList() {
        const wildcardList = $('wildcard-list');
        if (!wildcardList) return;

        wildcardList.innerHTML = '';
        for (const [category, tags] of Object.entries(this.wildcards)) {
            const item = document.createElement('div');
            item.className = 'wildcard-item';
            item.innerHTML = `
                <span class="wildcard-item-name">${category}</span>
                <span class="wildcard-item-count">${tags.length}</span>
            `;
            wildcardList.appendChild(item);
        }
    }

    setupAutocomplete() {
    const inspectorTagsInput = $('inspector-tag-input');
    if (!inspectorTagsInput) return;

        // Create dropdown container
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown hidden';
        dropdown.id = 'autocomplete-dropdown';
        inspectorTagsInput.parentNode.appendChild(dropdown);

        let selectedIndex = -1;
        let currentSuggestions = [];
        let autocompleteTimeout;

        inspectorTagsInput.addEventListener('input', (e) => {
            clearTimeout(autocompleteTimeout);
            autocompleteTimeout = setTimeout(() => {
                this.showInspectorAutocomplete(inspectorTagsInput, dropdown);
            }, 120);
        });

        inspectorTagsInput.addEventListener('keydown', (e) => {
            currentSuggestions = dropdown.querySelectorAll('.autocomplete-item:not(.hidden)');
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, currentSuggestions.length - 1);
                this.updateAutocompleteSelection(currentSuggestions, selectedIndex);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, -1);
                this.updateAutocompleteSelection(currentSuggestions, selectedIndex);
            } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < currentSuggestions.length) {
                e.preventDefault();
                const suggestion = currentSuggestions[selectedIndex];
                if (suggestion) {
                    this.insertAutocompleteTag(inspectorTagsInput, suggestion.textContent.trim());
                    dropdown.classList.add('hidden');
                    selectedIndex = -1;
                }
            } else if (e.key === 'Escape') {
                dropdown.classList.add('hidden');
                selectedIndex = -1;
            }
        });

        document.addEventListener('click', (e) => {
            if (!inspectorTagsInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
                selectedIndex = -1;
            }
        });
    }

    showAutocomplete(input, dropdown) {
        const text = input.value;
        const lastCommaIndex = text.lastIndexOf(',');
        const lastDoubleUnderscoreIndex = text.lastIndexOf('__');

        if (lastDoubleUnderscoreIndex <= lastCommaIndex) {
            dropdown.classList.add('hidden');
            return;
        }

        const startIndex = lastCommaIndex + 1;
        const searchText = text.substring(lastDoubleUnderscoreIndex + 2).toLowerCase();
        const suggestions = this.getFuzzySuggestions(searchText);

        if (suggestions.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }

        // Position dropdown
        const rect = input.getBoundingClientRect();
        dropdown.style.position = 'absolute';
        dropdown.style.top = (rect.bottom - input.parentNode.getBoundingClientRect().top) + 'px';
        dropdown.style.left = '0px';
        dropdown.style.width = rect.width + 'px';

        dropdown.innerHTML = '';
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            const [tag, category] = suggestion;
            const matchIndex = tag.toLowerCase().indexOf(searchText);
            const matchLength = searchText.length;
            
            let html = tag;
            if (matchIndex >= 0) {
                html = tag.substring(0, matchIndex) + 
                       '<strong>' + tag.substring(matchIndex, matchIndex + matchLength) + '</strong>' + 
                       tag.substring(matchIndex + matchLength);
            }
            
            item.innerHTML = `${html}<span class="autocomplete-category">${category}</span>`;
            item.addEventListener('click', () => {
                this.insertAutocompleteTag(input, tag);
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(item);
        });

        dropdown.classList.remove('hidden');
    }

    getFuzzySuggestions(searchText) {
        const suggestions = [];
        
        for (const [category, tags] of Object.entries(this.wildcards)) {
            for (const tag of tags) {
                const tagLower = tag.toLowerCase();
                if (tagLower.includes(searchText)) {
                    const score = this.calculateFuzzyScore(searchText, tagLower);
                    suggestions.push([tag, category, score]);
                }
            }
        }

        return suggestions
            .sort((a, b) => b[2] - a[2])
            .slice(0, 10)
            .map(item => [item[0], item[1]]);
    }

    calculateFuzzyScore(search, target) {
        let score = 0;
        let searchIndex = 0;

        for (let i = 0; i < target.length; i++) {
            if (searchIndex < search.length && target[i] === search[searchIndex]) {
                score += 1;
                searchIndex++;
            }
        }

        if (searchIndex === search.length) {
            score += (search.length / target.length) * 10;
        }

        if (target.startsWith(search)) {
            score += 5;
        }

        return score;
    }

    updateAutocompleteSelection(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    insertAutocompleteTag(input, tag) {
        const text = input.value;
        const lastDoubleUnderscoreIndex = text.lastIndexOf('__');
        const lastCommaIndex = text.lastIndexOf(',');

        if (lastDoubleUnderscoreIndex <= lastCommaIndex) return;

        const startIndex = lastCommaIndex + 1;
        const beforeText = text.substring(0, lastDoubleUnderscoreIndex);
        const afterText = text.substring(lastDoubleUnderscoreIndex).replace(/^__[\w]*/, '');
        
        input.value = beforeText + tag + afterText;
        input.focus();
        input.setSelectionRange(beforeText.length + tag.length, beforeText.length + tag.length);
    }

    // File Handling Functions
    async handleFiles(files) {
        console.log('[DatasetCreator] handleFiles called with', files.length, 'files');
        const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));

        if (fileArray.length === 0) {
            console.warn('[DatasetCreator] No image files found');
            return;
        }

        const totalFiles = fileArray.length;
        let loadedFiles = 0;

        showLoadingInfo(`Loading 0 / ${totalFiles} images...`);

        const promises = fileArray.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    images.push({
                        data: e.target.result,
                        file: file,
                        tags: []
                    });
                    loadedFiles++;
                    showLoadingInfo(`Loading ${loadedFiles} / ${totalFiles} images...`);
                    resolve();
                };
                reader.readAsDataURL(file);
            });
        });

        await Promise.all(promises);
        hideLoadingInfo();
        console.log('[DatasetCreator] Files loaded:', images.length, 'total images');
        this.updateUI();

        if (images.length > 0) {
            console.log('[DatasetCreator] Going to step 2...');
            setTimeout(() => this.goToStep(2), 500);
        }
    }

    async handleZipFile(file) {
        showLoadingInfo('Unpacking ZIP file...');

        const zip = await JSZip.loadAsync(file);
        const promises = [];
        let totalImages = 0;

        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir && relativePath.match(/\.(png|jpg|jpeg|webp)$/i)) {
                totalImages++;
            }
        });

        let loadedImages = 0;

        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir && relativePath.match(/\.(png|jpg|jpeg|webp)$/i)) {
                promises.push(
                    zipEntry.async('base64').then(async content => {
                        const ext = relativePath.split('.').pop();
                        const imgData = `data:image/${ext};base64,${content}`;
                        const txtPath = relativePath.replace(/\.(png|jpg|jpeg|webp)$/i, '.txt');

                        let tags = [];
                        try {
                            const tagContent = await zip.file(txtPath)?.async('string');
                            tags = tagContent ? tagContent.split(',').map(t => t.trim()).filter(t => t) : [];
                        } catch (e) {
                            tags = [];
                        }

                        loadedImages++;
                        showLoadingInfo(`Loading ${loadedImages} / ${totalImages} images from ZIP...`);

                        return {
                            data: imgData,
                            file: null,
                            tags: tags
                        };
                    })
                );
            }
        });

        const newImages = await Promise.all(promises);
        images = images.concat(newImages);
        hideLoadingInfo();
        this.updateUI();

        if (images.length > 0) {
            setTimeout(() => this.goToStep(2), 500);
        }
    }

    // UI Update Functions
    updateUI() {
        const nextBtn1 = $('nextBtn1');
        if (nextBtn1) nextBtn1.disabled = images.length === 0;
        this.updateLabeledCount();
        this.updateTagViewer();
        this.renderImages();
    }

    updateTagViewer() {
        const tagCounts = {};
        images.forEach(img => {
            img.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

        const uniqueTagCount = $('uniqueTagCount');
        if (uniqueTagCount) uniqueTagCount.textContent = sortedTags.length;

        const tagList = $('tagList');
        if (!tagList) return;

        tagList.innerHTML = '';

        if (sortedTags.length === 0) {
            tagList.innerHTML = '<div style="color: #72767d; font-style: italic;">No tags</div>';
            return;
        }

        sortedTags.forEach(([tag, count]) => {
            const tagItem = document.createElement('div');
            tagItem.className = `tag-item ${selectedTags.has(tag) ? 'selected' : ''}`;
            tagItem.innerHTML = `
                <span>${tag}</span>
                <span class="tag-item-count">${count}</span>
            `;
            tagItem.onclick = () => this.toggleTagSelection(tag);
            tagList.appendChild(tagItem);
        });
    }

    updateLabeledCount() {
        const labeled = images.filter(img => img.tags.length > 0).length;
        const labeledCount = $('labeledCount');
        if (labeledCount) labeledCount.textContent = `${labeled} / ${images.length} with tags`;

        const totalImages = $('totalImages');
        if (totalImages) totalImages.textContent = images.length;

        const taggedImages = $('taggedImages');
        if (taggedImages) taggedImages.textContent = labeled;
    }

    renderImages() {
        const grid = $('imageGrid');
        if (!grid) return;

        grid.innerHTML = '';

        const start = (currentPage - 1) * imagesPerPage;
        const end = start + imagesPerPage;

        let filteredImages = images;
        if (selectedTags.size > 0) {
            filteredImages = images.filter(img =>
                Array.from(selectedTags).some(tag => img.tags.includes(tag))
            );
        }

        const pageImages = filteredImages.slice(start, end);

        pageImages.forEach((img, index) => {
            const globalIndex = images.indexOf(img);
            const card = document.createElement('div');
            card.className = 'image-card';

            const tagsHtml = img.tags.length > 0
                ? img.tags.map(tag => `<span class="tag-badge" onclick="removeTag(${globalIndex}, '${tag.replace(/'/g, "\\'")}'); event.stopPropagation();">${tag}</span>`).join('')
                : '<span class="no-tags">No tags</span>';

            card.innerHTML = `
                <img src="${img.data}" alt="Image ${globalIndex + 1}">
                <div class="image-actions">
                    <button class="action-btn" onclick="showZoomModal('${img.data}'); event.stopPropagation();">🔍</button>
                    <button class="action-btn delete" onclick="deleteImage(${globalIndex}); event.stopPropagation();">🗑️</button>
                </div>
                <div class="image-info">
                    <div class="tags-display">${tagsHtml}</div>
                    <input type="text"
                           class="tag-input"
                           placeholder="Add tag (tag1 or tag1, tag2)"
                           onkeypress="handleTagInput(event, ${globalIndex})"
                           id="tagInput${globalIndex}">
                    <button class="add-tag-btn" onclick="addTagFromInput(${globalIndex})">➕ Add Tag</button>
                </div>
            `;
            grid.appendChild(card);
        });

        this.renderPagination(filteredImages.length);
    }

    renderPagination(totalItems = images.length) {
        const pagination = $('pagination');
        if (!pagination) return;

        const totalPages = Math.ceil(totalItems / imagesPerPage);

        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = `
            <button class="page-btn" onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>‹‹</button>
            <button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
        `;

        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            const page = i <= 3 ? i : totalPages - (5 - i);
            if (page > 0 && page <= totalPages) {
                html += `<button class="page-btn ${currentPage === page ? 'active' : ''}" onclick="changePage(${page})">${page}</button>`;
            }
        }

        html += `
            <button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
            <button class="page-btn" onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>››</button>
        `;

        pagination.innerHTML = html;
    }

    // Tag Management Functions
    removeTag(imageIndex, tag) {
        images[imageIndex].tags = images[imageIndex].tags.filter(t => t !== tag);
        this.updateUI();
    }

    toggleTagSelection(tag) {
        if (selectedTags.has(tag)) {
            selectedTags.delete(tag);
        } else {
            selectedTags.add(tag);
        }
        currentPage = 1;
        this.updateUI();
    }

    deselectAllTags() {
        selectedTags.clear();
        currentPage = 1;
        this.updateUI();
    }

    filterTags() {
        const searchTerm = ($('tagSearch')?.value || '').toLowerCase();
        const tagItems = document.querySelectorAll('.tag-item');

        tagItems.forEach(item => {
            const tagText = item.textContent.toLowerCase();
            if (tagText.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    toggleTagViewer() {
        tagViewerCollapsed = !tagViewerCollapsed;
        const content = $('tagViewerContent');
        const btn = document.querySelector('.collapse-btn');

        if (tagViewerCollapsed) {
            if (content) content.classList.add('collapsed');
            if (btn) btn.textContent = '▶';
        } else {
            if (content) content.classList.remove('collapsed');
            if (btn) btn.textContent = '▼';
        }
    }

    updateTags(index, value) {
        const newTags = value.split(',').map(t => t.trim()).filter(t => t);

        newTags.forEach(tag => {
            if (!images[index].tags.includes(tag)) {
                images[index].tags.push(tag);
            }
        });

        this.updateUI();
    }

    handleTagInput(event, index) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addTagFromInput(index);
        }
    }

    addTagFromInput(index) {
        const input = $(`tagInput${index}`);
        const value = input?.value.trim();

        if (value) {
            this.updateTags(index, value);
            if (input) input.value = '';
        }
    }

    // Menu Functions
    toggleActionsMenu(event) {
        event?.stopPropagation();
        const menu = $('actionsMenu');
        if (menu) menu.classList.toggle('active');

        if (menu && menu.classList.contains('active')) {
            setTimeout(() => {
                document.addEventListener('click', this.closeActionsMenu);
            }, 0);
        }
    }

    closeActionsMenu() {
        const menu = $('actionsMenu');
        if (menu) menu.classList.remove('active');
        document.removeEventListener('click', this.closeActionsMenu);
    }

    toggleResetMenu(event) {
        event?.stopPropagation();
        const menu = $('resetMenu');
        if (menu) menu.classList.toggle('active');

        if (menu && menu.classList.contains('active')) {
            const boundCloseResetMenu = this.closeResetMenu.bind(this);
            setTimeout(() => {
                document.addEventListener('click', boundCloseResetMenu);
                menu._closeResetMenuHandler = boundCloseResetMenu;
            }, 0);
        } else if (menu && menu._closeResetMenuHandler) {
            document.removeEventListener('click', menu._closeResetMenuHandler);
        }
    }

    closeResetMenu() {
        const menu = $('resetMenu');
        if (menu) {
            menu.classList.remove('active');
            if (menu._closeResetMenuHandler) {
                document.removeEventListener('click', menu._closeResetMenuHandler);
                menu._closeResetMenuHandler = null;
            }
        }
    }

    // Image Functions
    deleteImage(index) {
        if (confirm('Are you sure you want to delete this image?')) {
            images.splice(index, 1);

            let filteredImages = images;
            if (selectedTags.size > 0) {
                filteredImages = images.filter(img =>
                    Array.from(selectedTags).some(tag => img.tags.includes(tag))
                );
            }

            const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
            if (currentPage > totalPages && totalPages > 0) {
                currentPage = totalPages;
            }
            if (images.length === 0) {
                currentPage = 1;
            }

            this.updateUI();
        }
    }

    // Reset Functions
    resetTags() {
        if (confirm('Are you sure you want to reset all tags?')) {
            images.forEach(img => {
                img.tags = [];
            });
            this.updateUI();
            this.closeResetMenu();
        }
    }

    resetDataset() {
        if (confirm('Are you sure you want to delete the entire dataset? This will remove all images and tags.')) {
            images = [];
            currentPage = 1;
            this.updateUI();
            this.closeResetMenu();
            this.goToStep(1);
        }
    }

    // Modal Functions
    showUrlModal() {
        const modal = $('urlModal');
        if (modal) modal.classList.add('active');
    }

    hideUrlModal() {
        const modal = $('urlModal');
        if (modal) modal.classList.remove('active');
        const input = $('zipUrlInput');
        if (input) input.value = '';
    }

    async downloadZipFromUrl() {
        const url = $('zipUrlInput')?.value.trim();

        if (!url) {
            showToast('Please enter a URL', 'error');
            return;
        }

        if (!url.toLowerCase().endsWith('.zip')) {
            showToast('URL must point to a ZIP file', 'error');
            return;
        }

        this.hideUrlModal();
        showLoadingInfo('Downloading ZIP from URL...');

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to download file');

            const blob = await response.blob();
            await this.handleZipFile(new File([blob], 'download.zip', { type: 'application/zip' }));
        } catch (error) {
            hideLoadingInfo();
            showToast('Error downloading ZIP file: ' + error.message, 'error');
        }
    }

    showZoomModal(imageSrc) {
        const modal = $('zoomModal');
        const img = $('zoomImage');
        if (modal && img) {
            img.src = imageSrc;
            modal.classList.add('active');
        }
    }

    hideZoomModal() {
        const modal = $('zoomModal');
        if (modal) modal.classList.remove('active');
    }

    // Rename Tags Modal
    showRenameModal() {
        if (selectedTags.size === 0) {
            showToast('Please select tags to rename', 'error');
            return;
        }

        const container = $('renameTagsList');
        if (!container) return;

        container.innerHTML = '';

        Array.from(selectedTags).forEach(tag => {
            const item = document.createElement('div');
            item.className = 'tag-rename-item';
            item.innerHTML = `
                <label>Old tag: <strong>${tag}</strong></label>
                <input type="text" class="modal-input" id="rename_${tag.replace(/[^a-zA-Z0-9]/g, '_')}" value="${tag}" placeholder="New tag name" style="margin: 0;">
            `;
            container.appendChild(item);
        });

        const modal = $('renameModal');
        if (modal) modal.classList.add('active');
        this.closeActionsMenu();
    }

    hideRenameModal() {
        const modal = $('renameModal');
        if (modal) modal.classList.remove('active');
    }

    renameAllTags() {
        const renames = [];
        Array.from(selectedTags).forEach(oldTag => {
            const input = $(`rename_${oldTag.replace(/[^a-zA-Z0-9]/g, '_')}`);
            const newTag = input?.value.trim();
            if (newTag && newTag !== oldTag) {
                renames.push({ oldTag, newTag });
            }
        });

        if (renames.length === 0) {
            showToast('No changes to apply', 'error');
            return;
        }

        images.forEach(img => {
            renames.forEach(({ oldTag, newTag }) => {
                const index = img.tags.indexOf(oldTag);
                if (index !== -1) {
                    img.tags[index] = newTag;
                }
            });
        });

        selectedTags.clear();
        renames.forEach(({ newTag }) => selectedTags.add(newTag));

        this.updateUI();
        this.hideRenameModal();
        showToast(`Renamed ${renames.length} tags`, 'success');
    }

    // Add Global Tag Modal
    showAddGlobalTagModal() {
        const modal = $('addGlobalTagModal');
        if (modal) modal.classList.add('active');
        this.closeActionsMenu();
    }

    hideAddGlobalTagModal() {
        const modal = $('addGlobalTagModal');
        if (modal) modal.classList.remove('active');
        const input = $('globalTagInput');
        if (input) input.value = '';
    }

    addGlobalTag() {
        const globalTag = $('globalTagInput')?.value.trim();

        if (!globalTag) {
            showToast('Please enter a tag name', 'error');
            return;
        }

        let affectedCount = 0;
        images.forEach(img => {
            if (!img.tags.includes(globalTag)) {
                img.tags.unshift(globalTag);
                affectedCount++;
            }
        });

        showToast(`Tag "${globalTag}" added to ${affectedCount} images`, 'success');
        this.updateUI();
        this.hideAddGlobalTagModal();
    }

    // Replace Tags Modal
    showReplaceTagModal() {
        if (selectedTags.size === 0) {
            showToast('Please select tags to replace', 'error');
            return;
        }

        const container = $('replaceTagsList');
        if (!container) return;

        container.innerHTML = '';

        Array.from(selectedTags).forEach(tag => {
            const row = document.createElement('div');
            row.className = 'tag-replace-row';
            row.innerHTML = `
                <input type="text" class="tag-replace-input" value="${tag}" readonly>
                <span class="tag-replace-arrow">→</span>
                <input type="text" class="tag-replace-input" id="replace_${tag.replace(/[^a-zA-Z0-9]/g, '_')}" placeholder="New tag">
            `;
            container.appendChild(row);
        });

        const modal = $('replaceTagModal');
        if (modal) modal.classList.add('active');
        this.closeActionsMenu();
    }

    hideReplaceTagModal() {
        const modal = $('replaceTagModal');
        if (modal) modal.classList.remove('active');
    }

    replaceAllTags() {
        const replacements = [];
        Array.from(selectedTags).forEach(oldTag => {
            const input = $(`replace_${oldTag.replace(/[^a-zA-Z0-9]/g, '_')}`);
            const newTag = input?.value.trim();
            if (newTag) {
                replacements.push({ oldTag, newTag });
            }
        });

        if (replacements.length === 0) {
            showToast('Please fill in at least one replacement field', 'error');
            return;
        }

        let totalReplaced = 0;
        images.forEach(img => {
            replacements.forEach(({ oldTag, newTag }) => {
                const index = img.tags.indexOf(oldTag);
                if (index !== -1) {
                    img.tags[index] = newTag;
                    totalReplaced++;
                }
            });
        });

        selectedTags.clear();
        replacements.forEach(({ newTag }) => selectedTags.add(newTag));

        this.updateUI();
        this.hideReplaceTagModal();
        showToast(`Replaced ${replacements.length} tags (total replacements: ${totalReplaced})`, 'success');
    }

    // Navigation Functions
    goToStep(step) {
        console.log(`[DatasetCreator] Going to step ${step}...`);
        
        // Hide all content sections
        document.querySelectorAll('.dataset-content-step').forEach(el => {
            el.classList.remove('active');
        });
        
        // Map step number to data-step-content value
        const stepMap = {
            1: 'images',
            2: 'dataset',
            3: 'train'
        };
        const stepContent = stepMap[step];
        if (stepContent) {
            const sectionEl = document.querySelector(`.dataset-content-step[data-step-content="${stepContent}"]`);
            if (sectionEl) {
                sectionEl.classList.add('active');
                console.log(`[DatasetCreator] Step ${step} content activated`);
            } else {
                console.warn(`[DatasetCreator] Could not find step content: ${stepContent}`);
            }
        }

        // Update sidebar step highlighting
        document.querySelectorAll('.dataset-step').forEach((el, index) => {
            el.classList.remove('active', 'completed');
            const stepNum = index + 1;
            if (stepNum < step) {
                el.classList.add('completed');
            } else if (stepNum === step) {
                el.classList.add('active');
            }
        });

        // Update stage note
        const stageNoteEl = $('dataset-stage-note');
        if (stageNoteEl) {
            const stageTexts = {
                1: 'Stage 1 — upload images',
                2: 'Stage 2 — edit tags',
                3: 'Stage 3 — download dataset'
            };
            stageNoteEl.textContent = stageTexts[step] || 'Loading...';
        }

        if (step === 2) {
            console.log('[DatasetCreator] Rendering images...');
            currentPage = 1;
            this.renderImages();
        }
    }

    // Download Dataset Function
    async downloadDataset() {
        showLoadingInfo('Creating ZIP file...');

        const zip = new JSZip();

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const imgNum = i + 1;

            showLoadingInfo(`Adding image ${imgNum} / ${images.length}...`);

            const base64Data = img.data.split(',')[1];
            const ext = img.file ? img.file.name.split('.').pop() : 'png';
            zip.file(`img${imgNum}.${ext}`, base64Data, {base64: true});

            if (img.tags && img.tags.length > 0) {
                zip.file(`img${imgNum}.txt`, img.tags.join(', '));
            }
        }

        showLoadingInfo('Generating ZIP file...');
        const content = await zip.generateAsync({type: 'blob'});

        // GitHub Pages compatible download
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dataset.zip';
        a.style.display = 'none';
        document.body.appendChild(a);
        
        try {
            a.click();
            // Wait a bit for download to start, then cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 500);
        } catch (e) {
            console.error('Download error:', e);
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Failed to download dataset: ' + (e.message || e), 'error');
        }

        hideLoadingInfo();
    }

    // Inspector functions
    handleInspectorImage(file) {
        if (!file || !file.type.startsWith('image/')) {
            showToast('Please select a valid image file.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const newImage = {
                data: e.target.result,
                file: file,
                tags: []
            };
            images.unshift(newImage);
            this.updateUI();
            this.goToStep(2);
            showToast('Image added to dataset!', 'success');
        };
        reader.readAsDataURL(file);
    }

    saveInspectorTags() {
        // This would be called when saving tags from the inspector
        // For now, we'll just show a success message
        showToast('Tags saved!', 'success');
    }
    
    // Inspector-specific lightweight autocomplete using prefix matching over this.tokens
    showInspectorAutocomplete(input, dropdown) {
        const text = input.value || '';
        const q = text.trim().toLowerCase();
        if (!q) { dropdown.classList.add('hidden'); return; }

        const matches = [];
        for (const token of this.tokens) {
            if (!token) continue;
            const low = token.toLowerCase();
            if (low.startsWith(q)) matches.push(token);
            if (matches.length >= 10) break;
        }

        if (matches.length === 0) { dropdown.classList.add('hidden'); return; }
        dropdown.innerHTML = '';
        matches.forEach((tag, idx) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = tag;
            item.dataset.index = idx;
            item.addEventListener('click', () => {
                input.value = tag;
                dropdown.classList.add('hidden');
                input.focus();
            });
            item.addEventListener('mouseenter', () => {
                dropdown.querySelectorAll('.autocomplete-item').forEach(el => el.classList.remove('autocomplete-selected'));
                item.classList.add('autocomplete-selected');
                dropdown._selectedIndex = idx;
            });
            dropdown.appendChild(item);
        });
        dropdown.classList.remove('hidden');
    }

    updateAutocompleteSelection(items, index) {
        items.forEach((item, i) => {
            item.classList.remove('autocomplete-selected');
            if (i === index) {
                item.classList.add('autocomplete-selected');
                item.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    insertAutocompleteTag(input, tag) {
        input.value = tag;
        input.focus();
    }

}

// Global functions for HTML event handlers
window.removeTag = function(imageIndex, tag) {
    if (window._datasetCreator) {
        window._datasetCreator.removeTag(imageIndex, tag);
    }
};

window.showZoomModal = function(imageSrc) {
    if (window._datasetCreator) {
        window._datasetCreator.showZoomModal(imageSrc);
    }
};

window.deleteImage = function(index) {
    if (window._datasetCreator) {
        window._datasetCreator.deleteImage(index);
    }
};

window.handleTagInput = function(event, index) {
    if (window._datasetCreator) {
        window._datasetCreator.handleTagInput(event, index);
    }
};

window.addTagFromInput = function(index) {
    if (window._datasetCreator) {
        window._datasetCreator.addTagFromInput(index);
    }
};

window.changePage = function(page) {
    let filteredImages = images;
    if (selectedTags.size > 0) {
        filteredImages = images.filter(img =>
            Array.from(selectedTags).some(tag => img.tags.includes(tag))
        );
    }

    const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        if (window._datasetCreator) {
            window._datasetCreator.renderImages();
        }
    }
};

window.showUrlModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.showUrlModal();
    }
};

window.hideUrlModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.hideUrlModal();
    }
};

window.downloadZipFromUrl = function() {
    if (window._datasetCreator) {
        window._datasetCreator.downloadZipFromUrl();
    }
};

window.hideZoomModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.hideZoomModal();
    }
};

window.toggleTagViewer = function() {
    if (window._datasetCreator) {
        window._datasetCreator.toggleTagViewer();
    }
};

window.filterTags = function() {
    if (window._datasetCreator) {
        window._datasetCreator.filterTags();
    }
};

window.toggleActionsMenu = function(event) {
    if (window._datasetCreator) {
        window._datasetCreator.toggleActionsMenu(event);
    }
};

window.deselectAllTags = function() {
    if (window._datasetCreator) {
        window._datasetCreator.deselectAllTags();
    }
};

window.showRenameModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.showRenameModal();
    }
};

window.hideRenameModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.hideRenameModal();
    }
};

window.renameAllTags = function() {
    if (window._datasetCreator) {
        window._datasetCreator.renameAllTags();
    }
};

window.showAddGlobalTagModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.showAddGlobalTagModal();
    }
};

window.hideAddGlobalTagModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.hideAddGlobalTagModal();
    }
};

window.addGlobalTag = function() {
    if (window._datasetCreator) {
        window._datasetCreator.addGlobalTag();
    }
};

window.showReplaceTagModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.showReplaceTagModal();
    }
};

window.hideReplaceTagModal = function() {
    if (window._datasetCreator) {
        window._datasetCreator.hideReplaceTagModal();
    }
};

window.replaceAllTags = function() {
    if (window._datasetCreator) {
        window._datasetCreator.replaceAllTags();
    }
};

window.goToStep = function(step) {
    if (window._datasetCreator) {
        window._datasetCreator.goToStep(step);
    }
};

window.downloadDataset = function() {
    if (window._datasetCreator) {
        window._datasetCreator.downloadDataset();
    }
};

window.resetTags = function() {
    if (window._datasetCreator) {
        window._datasetCreator.resetTags();
    }
};

window.resetDataset = function() {
    if (window._datasetCreator) {
        window._datasetCreator.resetDataset();
    }
};

window.toggleResetMenu = function(event) {
    if (window._datasetCreator) {
        window._datasetCreator.toggleResetMenu(event);
    }
};


/* --- initialization --- */
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('error', (e) => {
        console.error('Global error:', e);
        showToast('An unexpected error occurred: ' + (e.message || e), 'error');
    });
    try {
        new ImageMetadataEditor();
    } catch (e) {
        console.error("Failed to initialize ImageMetadataEditor", e);
        showToast("Failed to initialize ImageMetadataEditor: " + e.message, 'error');
    }
    try {
        window._datasetCreator = new DatasetCreator();
    } catch (e) {
        console.error("Failed to initialize DatasetCreator", e);
        if (e.message.includes("Cannot read properties of null (reading 'addEventListener')")) {
            // This specific error is now expected if the dataset tab is not fully set up.
            // We can choose to ignore it or log a less severe warning.
            console.warn("DatasetCreator not fully initialized, probably because the dataset tab elements are not in the DOM yet.");
        } else {
            showToast("Failed to initialize DatasetCreator: " + e.message, 'error');
        }
    }
});

document.addEventListener('click', (e) => {
    const copyAllBtn = e.target.closest('#copy-all-tags-btn');
    if (!copyAllBtn) return;

    const tagFrequencyEl = document.getElementById('tag-frequency');
    if (!tagFrequencyEl) return;

    const tagElements = tagFrequencyEl.querySelectorAll('.tag-item .tag-text');
    if (tagElements.length === 0) {
        showToast('No tags to copy.', 'info');
        return;
    }

    const tags = Array.from(tagElements).map(el => {
        const text = el.textContent || '';
        return text.split(':')[0].trim(); // Extract only the tag name
    });

    const tagString = tags.join(', ');

    navigator.clipboard.writeText(tagString).then(() => {
        showToast('All tags copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Error copying all tags: ', err);
        showToast('Failed to copy tags.', 'error');
    });
});

/* ============ STABLE DIFFUSION INTEGRATION ============ */

class StableDiffusionUI {
    constructor() {
        this.api = new StableDiffusionAPI();
        this.inpaintCanvas = null;
        this.currentGenerationId = null;
        this.initializeSD();
    }

    initializeSD() {
        this.setupSettingsTab();
        this.setupTxt2imgTab();
        this.setupImg2imgTab();
        this.setupInpaintTab();
        this.loadSavedSettings();
    }

    loadSavedSettings() {
        const savedURL = localStorage.getItem('sd_api_url');
        if (savedURL) {
            document.getElementById('sd-api-url').value = savedURL;
            this.api.setBaseURL(savedURL);
        }
        const savedCivitai = localStorage.getItem('civitai_key');
        if (savedCivitai) {
            document.getElementById('sd-civitai-key').value = savedCivitai;
        }
        const savedHF = localStorage.getItem('hf_token');
        if (savedHF) {
            document.getElementById('sd-huggingface-token').value = savedHF;
        }
    }

    setupSettingsTab() {
        const testBtn = document.getElementById('sd-test-connection');
        const saveKeysBtn = document.getElementById('sd-save-keys');
        const urlInput = document.getElementById('sd-api-url');
        const civitaiInput = document.getElementById('sd-civitai-key');
        const hfInput = document.getElementById('sd-huggingface-token');

        testBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            if (!url) {
                showToast('Please enter API URL', 'error');
                return;
            }
            this.api.setBaseURL(url);
            testBtn.disabled = true;
            testBtn.textContent = 'Testing...';
            
            const connected = await this.api.testConnection();
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';

            const indicator = document.getElementById('sd-status-indicator');
            const statusText = document.getElementById('sd-status-text');
            
            if (connected) {
                indicator.style.backgroundColor = '#3ba55c'; // green
                statusText.textContent = 'Connected ✓';
                showToast('Connection successful!', 'success');
                this.loadModels();
                this.loadSamplers();
                this.loadLoras();
            } else {
                indicator.style.backgroundColor = '#ed4245'; // red
                statusText.textContent = 'Failed to connect';
                showToast('Connection failed. Check URL and ensure server is running.', 'error');
            }
        });

        saveKeysBtn.addEventListener('click', () => {
            const civitai = civitaiInput.value.trim();
            const hf = hfInput.value.trim();
            if (civitai) this.api.setCivitaiKey(civitai);
            if (hf) this.api.setHuggingFaceToken(hf);
            showToast('Keys saved to localStorage', 'success');
        });

        // Load models on startup
        setTimeout(() => this.loadModels(), 1000);
    }

    async loadModels() {
        const models = await this.api.getModels();
        const select = document.getElementById('sd-model');
        select.innerHTML = '';
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            select.appendChild(option);
        });
        // Also populate img2img model select
        const img2imgSelect = document.getElementById('sd-img2img-model');
        if (img2imgSelect) {
            img2imgSelect.innerHTML = select.innerHTML;
        }
    }

    async loadSamplers() {
        const samplers = await this.api.getSamplers();
        if (samplers.length === 0) return;
        
        const update = (selectId) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            const current = select.value;
            select.innerHTML = '';
            samplers.slice(0, 10).forEach(sampler => {
                const option = document.createElement('option');
                option.value = sampler;
                option.textContent = sampler;
                select.appendChild(option);
            });
            if (samplers.includes(current)) select.value = current;
        };
        
        update('sd-sampler');
        update('sd-img2img-sampler');
        update('sd-inpaint-sampler');
    }

    async loadLoras() {
        const loras = await this.api.getLoras();
        const container = document.getElementById('sd-lora-list');
        container.innerHTML = '';
        
        loras.forEach(lora => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.gap = '8px';
            div.style.marginBottom = '8px';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.loraName = lora.name;
            
            const weight = document.createElement('input');
            weight.type = 'number';
            weight.min = '0';
            weight.max = '2';
            weight.value = '1';
            weight.step = '0.1';
            weight.style.width = '60px';
            weight.style.marginLeft = 'auto';
            weight.disabled = true;
            weight.placeholder = 'Weight';
            
            checkbox.addEventListener('change', () => {
                weight.disabled = !checkbox.checked;
            });
            
            div.appendChild(checkbox);
            div.appendChild(document.createTextNode(lora.name));
            div.appendChild(weight);
            container.appendChild(div);
        });
    }

    setupTxt2imgTab() {
        const generateBtn = document.getElementById('sd-generate-btn');
        generateBtn.addEventListener('click', () => this.generateTxt2img());
    }

    async generateTxt2img() {
        if (!this.api.isConnected && !await this.api.testConnection()) {
            showToast('Not connected to API', 'error');
            return;
        }

        const prompt = document.getElementById('sd-prompt').value;
        const negativePrompt = document.getElementById('sd-negative').value;
        const model = document.getElementById('sd-model').value;
        const sampler = document.getElementById('sd-sampler').value;
        const steps = parseInt(document.getElementById('sd-steps').value);
        const cfg = parseFloat(document.getElementById('sd-cfg').value);
        const width = parseInt(document.getElementById('sd-width').value);
        const height = parseInt(document.getElementById('sd-height').value);
        const seed = parseInt(document.getElementById('sd-seed').value);
        const batchCount = parseInt(document.getElementById('sd-batch-count').value);
        const batchSize = parseInt(document.getElementById('sd-batch-size').value);

        const params = {
            prompt,
            negative_prompt: negativePrompt,
            steps,
            cfg_scale: cfg,
            width,
            height,
            seed: seed === -1 ? Math.floor(Math.random() * 2**31) : seed,
            batch_count: batchCount,
            batch_size: batchSize,
            sampler_name: sampler,
            sd_model_checkpoint: model
        };

        // Add LoRAs
        const checkedLoras = document.querySelectorAll('#sd-lora-list input[type="checkbox"]:checked');
        if (checkedLoras.length > 0) {
            const loraPrompt = Array.from(checkedLoras).map(cb => {
                const weight = cb.parentElement.querySelector('input[type="number"]').value;
                return `<lora:${cb.dataset.loraName}:${weight}>`;
            }).join(' ');
            params.prompt += ' ' + loraPrompt;
        }

        await this.generateWithProgress(params, 'txt2img');
    }

    setupImg2imgTab() {
        const dropArea = document.getElementById('sd-img2img-drop');
        const preview = document.getElementById('sd-img2img-preview');
        const generateBtn = document.getElementById('sd-img2img-generate-btn');
        
        this.setupDropZone(dropArea, (file) => this.loadImg2imgImage(file, preview));
        generateBtn.addEventListener('click', () => this.generateImg2img());
    }

    async loadImg2imgImage(file, previewContainer) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            img.style.borderRadius = '8px';
            previewContainer.innerHTML = '';
            previewContainer.appendChild(img);
            this.img2imgImageData = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async generateImg2img() {
        if (!this.img2imgImageData) {
            showToast('Please upload an image first', 'error');
            return;
        }

        const prompt = document.getElementById('sd-img2img-prompt').value;
        const negativePrompt = document.getElementById('sd-img2img-negative').value;
        const denoising = parseFloat(document.getElementById('sd-img2img-denoising').value);
        const sampler = document.getElementById('sd-img2img-sampler').value;
        const steps = parseInt(document.getElementById('sd-img2img-steps').value);
        const cfg = parseFloat(document.getElementById('sd-img2img-cfg').value);
        const model = document.getElementById('sd-model').value;

        const params = {
            prompt,
            negative_prompt: negativePrompt,
            steps,
            cfg_scale: cfg,
            denoising_strength: denoising,
            sampler_name: sampler,
            sd_model_checkpoint: model
        };

        await this.generateWithProgress(params, 'img2img', this.img2imgImageData);
    }

    setupInpaintTab() {
        const dropArea = document.getElementById('sd-inpaint-drop');
        const canvasSection = document.getElementById('sd-inpaint-canvas-section');
        const generateBtn = document.getElementById('sd-inpaint-generate-btn');

        this.setupDropZone(dropArea, (file) => this.loadInpaintImage(file, canvasSection));
        
        document.getElementById('sd-brush-btn').addEventListener('click', () => {
            this.inpaintCanvas.setTool('brush');
            this.updateInpaintToolUI();
        });
        document.getElementById('sd-eraser-btn').addEventListener('click', () => {
            this.inpaintCanvas.setTool('eraser');
            this.updateInpaintToolUI();
        });
        document.getElementById('sd-clear-btn').addEventListener('click', () => {
            if (this.inpaintCanvas) this.inpaintCanvas.clear();
        });
        document.getElementById('sd-brush-size').addEventListener('input', (e) => {
            if (this.inpaintCanvas) this.inpaintCanvas.setBrushSize(e.target.value);
        });

        generateBtn.addEventListener('click', () => this.generateInpaint());
    }

    async loadInpaintImage(file, canvasSection) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            // Create and initialize canvas
            if (!this.inpaintCanvas) {
                this.inpaintCanvas = new InpaintCanvas('sd-inpaint-canvas', e.target.result);
            } else {
                await this.inpaintCanvas.loadImage(e.target.result);
            }
            canvasSection.style.display = 'block';
            this.inpaintImageData = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateInpaintToolUI() {
        const brushBtn = document.getElementById('sd-brush-btn');
        const eraserBtn = document.getElementById('sd-eraser-btn');
        brushBtn.style.opacity = this.inpaintCanvas.tool === 'brush' ? '1' : '0.6';
        eraserBtn.style.opacity = this.inpaintCanvas.tool === 'eraser' ? '1' : '0.6';
    }

    async generateInpaint() {
        if (!this.inpaintCanvas || !this.inpaintImageData) {
            showToast('Please upload an image and draw a mask', 'error');
            return;
        }

        const prompt = document.getElementById('sd-inpaint-prompt').value;
        const maskBlur = parseInt(document.getElementById('sd-inpaint-mask-blur').value);
        const inpaintArea = document.getElementById('sd-inpaint-area').value;
        const steps = parseInt(document.getElementById('sd-inpaint-steps').value);
        const sampler = document.getElementById('sd-sampler').value;
        const model = document.getElementById('sd-model').value;

        const params = {
            prompt,
            steps,
            sampler_name: sampler,
            sd_model_checkpoint: model,
            mask_blur: maskBlur,
            inpaint_area: inpaintArea === 'Only masked' ? 'masked' : 'whole'
        };

        const maskBase64 = this.inpaintCanvas.getMaskBase64();
        await this.generateWithProgress(params, 'inpaint', this.inpaintImageData, maskBase64);
    }

    async generateWithProgress(params, mode, imageData = null, maskData = null) {
        const generateBtn = mode === 'txt2img' ? 
            document.getElementById('sd-generate-btn') :
            mode === 'img2img' ?
            document.getElementById('sd-img2img-generate-btn') :
            document.getElementById('sd-inpaint-generate-btn');

        generateBtn.disabled = true;
        const progressContainer = document.getElementById('sd-progress-container');
        progressContainer.classList.remove('hidden');

        try {
            let result;
            if (mode === 'txt2img') {
                result = await this.api.txt2img(params);
            } else if (mode === 'img2img') {
                result = await this.api.img2img(params, imageData);
            } else if (mode === 'inpaint') {
                result = await this.api.inpaint(params, imageData, maskData);
            }

            // Display results
            this.displayResults(result.images, mode);
            showToast('Generation complete!', 'success');

            // Poll for progress
            this.startProgressPolling();
        } catch (err) {
            console.error('Generation error:', err);
            showToast('Generation failed: ' + err.message, 'error');
        } finally {
            generateBtn.disabled = false;
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 2000);
        }
    }

    startProgressPolling() {
        const progressBar = document.getElementById('sd-progress-fill');
        const progressText = document.getElementById('sd-progress-text');

        const poll = async () => {
            const progress = await this.api.getProgress();
            const percent = Math.round(progress.progress * 100);
            progressBar.style.width = percent + '%';
            progressText.textContent = percent + '%';

            if (progress.progress < 1) {
                setTimeout(poll, 500);
            }
        };
        poll();
    }

    displayResults(images, mode) {
        const containerId = mode === 'txt2img' ? 'sd-images-grid' :
                           mode === 'img2img' ? 'sd-img2img-images' :
                           'sd-inpaint-images';
        const container = document.getElementById(containerId);
        const resultsContainer = containerId.replace('-grid', '-results').replace('-images', '-results');
        const results = document.getElementById(resultsContainer);

        container.innerHTML = '';
        images.forEach((imgBase64, idx) => {
            const card = document.createElement('div');
            card.className = 'sd-image-card';
            
            const img = document.createElement('img');
            img.src = 'data:image/png;base64,' + imgBase64;
            card.appendChild(img);

            const actions = document.createElement('div');
            actions.className = 'sd-image-actions';
            
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = 'data:image/png;base64,' + imgBase64;
                link.download = `generated_${Date.now()}_${idx}.png`;
                link.click();
            });

            actions.appendChild(downloadBtn);
            card.appendChild(actions);
            container.appendChild(card);
        });

        results.classList.remove('hidden');
    }

    setupDropZone(el, handler) {
        if (!el) return;
        const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter','dragover','dragleave','drop'].forEach(ev => el.addEventListener(ev, prevent, {passive:false}));
        el.addEventListener('dragenter', () => el.classList.add('highlight'));
        el.addEventListener('dragover', () => el.classList.add('highlight'));
        el.addEventListener('dragleave', () => el.classList.remove('highlight'));
        el.addEventListener('drop', (e) => {
            el.classList.remove('highlight');
            if (e.dataTransfer?.files?.[0]) {
                handler(e.dataTransfer.files[0]);
            }
        });
        el.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                if (e.target.files?.[0]) handler(e.target.files[0]);
            };
            input.click();
        });
    }
}

// Initialize SD UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window._sdUI = new StableDiffusionUI();
});

