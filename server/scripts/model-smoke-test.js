// Sends the bundled sample images to the live Hugging Face Space and checks the verdicts.
// Usage: npm run test:model   (needs internet; the Space may take a minute to wake up)
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { classifyRetina } from '../src/model.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = [process.env.SAMPLE_DIR, path.join(here, '..', '..', 'sample-data'), path.join(here, '..', '..', '..', 'docs', 'sample-images')]
  .filter(Boolean)
  .find((d) => fs.existsSync(d));
if (!dir) {
  console.error('Sample images not found. Set SAMPLE_DIR to the folder containing them.');
  process.exit(1);
}

const cases = [
  { file: 'YESDR.jpg', mime: 'image/jpeg', expectDr: true },
  { file: 'NODR.png', mime: 'image/png', expectDr: false },
];

let failed = 0;
for (const c of cases) {
  const buf = fs.readFileSync(path.join(dir, c.file));
  const r = await classifyRetina(buf, c.file, c.mime);
  const ok = r.drDetected === c.expectDr;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.file.padEnd(10)} -> ${r.prediction} (${(r.confidence * 100).toFixed(2)}%)`);
}
process.exit(failed ? 1 : 0);
