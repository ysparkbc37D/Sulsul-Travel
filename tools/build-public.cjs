/* 배포에는 앱 실행에 필요한 공개 파일만 복사한다. 여행 자료·개발 문서는 포함하지 않는다. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['index.html','kb-travel.js','sw.js','manifest.webmanifest','guide.html','privacy.html','sync.html','docs.css','donate-qr.png','favicon.png','favicon.ico','apple-touch-icon.png','icon-192.png','icon-512.png'];
// 서비스워커의 명시적 공개 자산 목록을 사용한다. 폴더 내부의 새 자료를 자동 배포하지 않는다.
function publicAssets() {
  const source=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const list=source.match(/const PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
  if(!list)throw new Error('PUBLIC_ASSET_LIST_MISSING');
  const assets=[...list[1].matchAll(/'\.\/([^']*)'/g)].map(match=>match[1].split('?')[0]||'index.html');
  for(const asset of assets) {
    const resolved=path.resolve(root,asset);
    if(!resolved.startsWith(root+path.sep)||asset.split('/').some(part=>part.startsWith('.')))throw new Error('INVALID_PUBLIC_ASSET');
    if(fs.lstatSync(resolved).isSymbolicLink())throw new Error('PUBLIC_ASSET_SYMLINK');
  }
  return [...new Set([...files,...assets])];
}
function buildPublic(output=path.join(root,'public')) {
  const target=path.resolve(output);
  if(target!==path.join(root,'public')&&!target.startsWith(path.join(root,'.local-review')+path.sep))throw new Error('INVALID_PUBLIC_OUTPUT');
  // 생성 디렉터리가 없거나 비어 있을 때만 만든다. 사용자 파일을 지우지 않는다.
  if(fs.existsSync(target)&&fs.readdirSync(target).length)throw new Error('PUBLIC_OUTPUT_NOT_EMPTY');
  const assets=publicAssets();
  fs.mkdirSync(target,{recursive:true});
  assets.forEach(file=>{fs.mkdirSync(path.dirname(path.join(target,file)),{recursive:true});fs.copyFileSync(path.join(root,file),path.join(target,file));});
  return {output:target,files:assets};
}
if(require.main===module){const result=buildPublic();process.stdout.write(`공개 앱 배포 파일 생성 완료: ${result.output}\n`);}
module.exports={buildPublic,files,publicAssets};
