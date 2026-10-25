import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = join(projectDir, 'dist');
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'vercel.json']) {
  await cp(join(projectDir, file), join(outputDir, file));
}
console.log('Static build created in ./dist');
