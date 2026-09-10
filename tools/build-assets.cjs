const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const assets = [
  ['@fortawesome/fontawesome-free/css/all.min.css','fontawesome/css/all.min.css'],
  ['@fortawesome/fontawesome-free/webfonts/fa-solid-900.woff2','fontawesome/webfonts/fa-solid-900.woff2'],
  ['@fortawesome/fontawesome-free/webfonts/fa-regular-400.woff2','fontawesome/webfonts/fa-regular-400.woff2'],
  ['@fortawesome/fontawesome-free/webfonts/fa-brands-400.woff2','fontawesome/webfonts/fa-brands-400.woff2'],
  ['@fortawesome/fontawesome-free/LICENSE.txt','fontawesome/LICENSE.txt'],
  ['leaflet/dist/leaflet.js','leaflet/leaflet.js'],
  ['leaflet/dist/leaflet.css','leaflet/leaflet.css'],
  ['leaflet/dist/images','leaflet/images'],
  ['leaflet/LICENSE','leaflet/LICENSE'],
  ['lz-string/libs/lz-string.min.js','lz-string/lz-string.min.js'],
  ['lz-string/LICENSE','lz-string/LICENSE']
];
for(const [source,target] of assets) {
  const dest=path.join(root,'vendor',target);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.cpSync(path.join(root,'node_modules',source),dest,{recursive:true});
}
console.log('Local icons, map engine and sharing assets updated.');
