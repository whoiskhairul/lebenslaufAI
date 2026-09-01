const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'src');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|css|js)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const DICT = {
  '\u00e2\u20ac\u00a2': '•',
  '\u00e2\u20ac\u201c': '–',
  '\u00e2\u20ac\u201d': '—',
  '\u00e2\u20ac\u02dc': '‘',
  '\u00e2\u20ac\u2122': '’',
  '\u00e2\u20ac\u0153': '“',
  '\u00e2\u20ac\u009d': '”',
  '\u00e2\u201e\u00a2': '™',
  '\u00c3\u00a9': 'é',
  '\u00c3\u00bc': 'ü',
  '\u00c3\u00b6': 'ö',
  '\u00c3\u00a4': 'ä',
  '\u00c3\u0178': 'ß',
  '\u00c3\u009c': 'Ü',
  '\u00c3\u2013': 'Ö',
  '\u00c3\u201e': 'Ä',
};

function fixMojibake(text) {
  let res = text;
  for (const [bad, good] of Object.entries(DICT)) {
    res = res.split(bad).join(good);
  }
  return res;
}

let touched = 0;
for (const file of walk(ROOT)) {
  const original = fs.readFileSync(file, 'utf8');
  const fixed = fixMojibake(original);
  if (fixed !== original) {
    fs.writeFileSync(file, fixed, 'utf8');
    touched++;
    console.log('fixed:', path.relative(ROOT, file));
  }
}
console.log('files repaired:', touched);
