/* 로컬 JS·CSS가 HTML과 같은 배포본인지 브라우저가 검사하도록 해시를 갱신한다. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function updateIntegrity({check=false,rootDir=root}={}) {
  const file=path.join(rootDir,'index.html'),source=fs.readFileSync(file,'utf8');
  let count=0;
  const updated=source.replace(/<(?:script|link)\b[^>]*>/g,tag=>{
    const match=tag.match(/\b(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/);
    if(!match||/^(?:https?:|\/\/|data:)/.test(match[1])||! /\.(?:js|css)$/.test(match[1]))return tag;
    const asset=path.resolve(rootDir,match[1]);
    if(!asset.startsWith(rootDir+path.sep))throw new Error('INVALID_INTEGRITY_ASSET');
    const hash='sha384-'+crypto.createHash('sha384').update(fs.readFileSync(asset)).digest('base64');
    count++;
    return tag.replace(/\s+integrity="[^"]*"/g,'').replace(/>$/,` integrity="${hash}">`);
  });
  if(check&&updated!==source)throw new Error('ASSET_INTEGRITY_OUTDATED: node tools/update-asset-integrity.cjs');
  if(!check&&updated!==source)fs.writeFileSync(file,updated);
  return count;
}
if(require.main===module)console.log(JSON.stringify({integrityAssets:updateIntegrity({check:process.argv.includes('--check')})}));
module.exports={updateIntegrity};
