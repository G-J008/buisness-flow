// Copies the two typefaces from their npm packages into public/vendor/fonts before each build,
// so the app serves its own fonts without keeping binary files in the repository.
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'public', 'vendor', 'fonts');
const pkg = (name) => path.dirname(require.resolve(name + '/package.json'));
const files = [
  ['@fontsource-variable/instrument-sans', 'files/instrument-sans-latin-wght-normal.woff2', 'instrument-sans-latin-wght-normal.woff2'],
  ['@fontsource-variable/instrument-sans', 'LICENSE', 'OFL-InstrumentSans.txt'],
  ['@fontsource-variable/source-serif-4', 'files/source-serif-4-latin-wght-normal.woff2', 'source-serif-4-latin-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'files/source-serif-4-latin-ext-wght-normal.woff2', 'source-serif-4-latin-ext-wght-normal.woff2'],
  ['@fontsource-variable/source-serif-4', 'LICENSE', 'OFL-SourceSerif4.txt'],
];

fs.mkdirSync(out, { recursive: true });
for (const [name, from, to] of files) {
  fs.copyFileSync(path.join(pkg(name), from), path.join(out, to));
}
console.log('fonts copied to public/vendor/fonts');
