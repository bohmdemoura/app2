const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');

const vf = JSON.parse(readFileSync('version.json', 'utf8'));
const [major, minor, patch] = vf.version.split('.').map(Number);
vf.version = `${major}.${minor}.${patch + 1}`;
writeFileSync('version.json', JSON.stringify(vf, null, 2));

const files = ['index.html', 'dashboard.html', '404.html'];
files.forEach(file => {
  let html = readFileSync(file, 'utf8');
  html = html.replace(/data-version="[^"]*"/, `data-version="${vf.version}"`);
  html = html.replace(/>v\d+\.\d+\.\d+<\/p>/, `>v${vf.version}</p>`);
  writeFileSync(file, html);
  console.log(`✔ ${file} → v${vf.version}`);
});

console.log('\n🚀 Iniciando deploy no Firebase...\n');
try {
  execSync('firebase deploy --only hosting', { stdio: 'inherit', cwd: '..' });
  console.log(`\n✅ Deploy concluído — v${vf.version}`);
} catch (e) {
  console.error('\n❌ Erro no deploy. Verifique se o Firebase CLI está instalado e você está autenticado.');
  process.exit(1);
}