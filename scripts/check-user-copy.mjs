import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const sourceTargets = ['index.html', 'src', 'public'];
const textExtensions = new Set([
  '.astro',
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.svelte',
  '.ts',
  '.tsx',
  '.vue',
]);
const forbiddenCharacter = '\u2014';

async function collectTextFiles(target) {
  const targetPath = resolve(projectRoot, target);
  const targetStats = await stat(targetPath);

  if (targetStats.isFile()) {
    return textExtensions.has(extname(targetPath)) ? [targetPath] : [];
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => collectTextFiles(resolve(targetPath, entry.name))),
  );
  return nestedFiles.flat();
}

const files = (await Promise.all(sourceTargets.map(collectTextFiles))).flat();
const violations = [];

for (const file of files) {
  const contents = await readFile(file, 'utf8');
  const lines = contents.split(/\r?\n/);

  lines.forEach((line, index) => {
    const column = line.indexOf(forbiddenCharacter);
    if (column !== -1) {
      violations.push(`${file.slice(projectRoot.length + 1)}:${index + 1}:${column + 1}`);
    }
  });
}

if (violations.length > 0) {
  console.error('User-facing copy must not contain em dashes.');
  violations.forEach((violation) => console.error(`  ${violation}`));
  process.exitCode = 1;
} else {
  console.log('User-facing copy check passed.');
}
