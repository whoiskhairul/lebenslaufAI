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

// Matches runs that look like UTF-8 bytes mis-decoded as CP1252:
// lead chars in the Ã/Â/â€Š range followed by CP1252 continuation chars.
const MOJIBAKE_RUN = /[\u00c2-\u00c5][\u0080-\u00bf\u2019\u201c\u201d\u2022\u2013\u2014\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u201a\u201e\u2020\u2021\u02dc\u203a\u0153\u017e\u0178\u00a0-\u00ff]*/g;

function fixMojibake(text) {
  return text.replace(MOJIBAKE_RUN, (frag) => {
    try {
      const bytes = Buffer.from(frag, 'latin1');
      const fixed = bytes.toString('utf8');
      if (!fixed.includes('\uFFFD') && /[\u00a0-\u02ff\u2000-\u330f\ufe0f]/.test(fixed)) {
        return fixed;
      }
    } catch (_) { /* keep original */ }
    return frag;
  });
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
