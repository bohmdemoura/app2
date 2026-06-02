import { readFileSync, writeFileSync } from 'fs';

const vf = JSON.parse(readFileSync('version.json', 'utf8'));
const [major, minor, patch] = vf.version.split('.').map(Number);
vf.version = `${major}.${minor}.${patch + 1}`;
writeFileSync('version.json', JSON.stringify(vf, null, 2));

const files = ['index.html', 'dashboard.html', '404.html'];
files.forEach(file => {
  let html = readFileSync(file, 'utf8');
  html = html.replace(/data-version="[^"]*"/, `data-version="${vf.version}"`);
  writeFileSync(file, html);
  console.log(`✔ ${file} → v${vf.version}`);
});