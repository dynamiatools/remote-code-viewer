import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { resolveInWorkspace } from '../workspace.mjs';
import { detectLang } from '../languages.mjs';
import { badRequest, notFound, tooLarge } from '../errors.mjs';

function looksBinary(buf) {
  return buf.includes(0);
}

/** Reads at most `maxBytes`, reporting whether the cap was hit. */
function readBounded(absPath, maxBytes) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(absPath, { start: 0, end: maxBytes });
    const chunks = [];
    let size = 0;
    stream.on('data', (chunk) => {
      size += chunk.length;
      chunks.push(chunk);
    });
    stream.on('end', () => {
      const buf = Buffer.concat(chunks);
      const truncated = buf.length > maxBytes;
      resolve({ buf: truncated ? buf.subarray(0, maxBytes) : buf, truncated });
    });
    stream.on('error', reject);
  });
}

export async function getFile(ctx, params) {
  const rawPath = params.get('path');
  if (!rawPath) throw badRequest();

  const { abs, rel } = await resolveInWorkspace(ctx, rawPath);

  let stat;
  try {
    stat = await fsp.stat(abs);
  } catch {
    throw notFound();
  }
  if (!stat.isFile()) throw notFound();

  const name = path.posix.basename(rel);
  const lang = detectLang(name);
  const base = { path: rel, name, size: stat.size, mtime: stat.mtimeMs, lang };

  if (stat.size > ctx.config.limits.maxFileSize) {
    throw tooLarge(base);
  }

  const { buf, truncated } = await readBounded(abs, ctx.config.limits.maxFileSize);
  const sniff = buf.subarray(0, ctx.config.limits.binarySniffBytes);

  if (looksBinary(sniff)) {
    return { ...base, lines: 0, binary: true, truncated: false, content: null };
  }

  const content = buf.toString('utf8').replace(/[\uD800-\uDFFF]/g, '�');
  const lines = content.length === 0 ? 0 : content.split('\n').length;

  return { ...base, lines, binary: false, truncated, content };
}
