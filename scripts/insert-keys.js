const fs = require('fs');
const path = '/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx';
const newKeys = JSON.parse(fs.readFileSync('/home/z/my-project/scripts/i18n-keys.json', 'utf8'));

const sections = [
  { lang: 'en', insertBeforeLine: 835 },
  { lang: 'pt', insertBeforeLine: 1372 },
  { lang: 'pt-BR', insertBeforeLine: 2093 },
  { lang: 'es', insertBeforeLine: 2772 },
  { lang: 'fr', insertBeforeLine: 3418 },
  { lang: 'hi', insertBeforeLine: 4126 },
];

let content = fs.readFileSync(path, 'utf-8');
const lines = content.split('\n');
console.log('Original lines:', lines.length);

for (const sec of sections.reverse()) {
  const lang = sec.lang;
  const keys = newKeys[lang];
  if (!keys || Object.keys(keys).length === 0) continue;
  const block = keys.map(([k, v]) => '    "' + k + '": "' + v + '",').join('\n');
  const pos = sec.insertBeforeLine;
  console.log('Inserting', Object.keys(keys).length, 'keys for', lang, 'at line', pos + 1);
  lines.splice(pos, 0, ...block.split('\n'));
}

fs.writeFileSync(path, '\n'.join(lines), 'utf-8');
console.log('Done. Lines:', lines.length);
