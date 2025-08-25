#!/usr/bin/env node
/*
  Fetch PPTX dependencies into public/vendor at build time.
  Files:
  - jquery.min.js
  - jszip.min.js
  - reveal.js
  - reveal.css
  - pptxjs.min.js
  - divs2slides.min.js
  - pptxjs.css
*/
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'vendor');
const files = [
  {
    name: 'jquery.min.js',
    url: 'https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js',
  },
  {
    name: 'jszip.min.js',
    url: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  },
  {
    name: 'reveal.js',
    url: 'https://cdn.jsdelivr.net/npm/reveal.js@4.6.1/dist/reveal.js',
  },
  {
    name: 'reveal.css',
    url: 'https://cdn.jsdelivr.net/npm/reveal.js@4.6.1/dist/reveal.css',
  },
  {
    name: 'filereader.js',
    url: 'https://cdn.jsdelivr.net/npm/filereader@0.10.3/FileReader.min.js',
  },
  {
    name: 'pptxjs.min.js',
    url: 'https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/pptxjs.min.js',
  },
  {
    name: 'divs2slides.min.js',
    url: 'https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/divs2slides.min.js',
  },
  {
    name: 'pptxjs.css',
    url: 'https://cdn.jsdelivr.net/npm/pptxjs@1.21.1/dist/pptxjs.css',
  },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function run() {
  if (typeof fetch !== 'function') {
    // Node <18 fallback
    const nodeFetch = require('node-fetch');
    global.fetch = nodeFetch;
  }
  await ensureDir(outDir);
  for (const f of files) {
    const dest = path.join(outDir, f.name);
    try {
      // Skip if already exists and non-empty
      const stat = await fs.promises.stat(dest).catch(() => null);
      if (stat && stat.size > 0) continue;
      const buf = await download(f.url);
      await fs.promises.writeFile(dest, buf);
      // eslint-disable-next-line no-console
      console.log(`Fetched ${f.name}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`Warning: could not fetch ${f.name}:`, e.message || e);
    }
  }
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


