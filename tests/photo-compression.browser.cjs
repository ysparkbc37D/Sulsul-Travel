/* 개인정보 없는 합성 원본으로 실제 브라우저 압축량·전체 프레임·문서 확대를 검증한다.
 * OCR 검사가 아니다. 텍스트 행의 대비와 크기는 판독 정확도를 보장하지 않는다. */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.local-review','photo-compression');
const modulePath='js/infrastructure/storage/photo-compression.js';
const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  res.setHeader('Cache-Control','no-store');
  if(!name){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><title>합성 사진 압축 검사</title><style>body{margin:24px;font:16px "Malgun Gothic",sans-serif;background:#edf0f4;color:#142234}canvas{display:block;background:white}h1{font-size:24px}p{max-width:1100px;line-height:1.5}</style><script src="/'+modulePath+'"></script>');return;}
  if(name!==modulePath){res.writeHead(404).end();return;}
  res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(root,modulePath)));
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
    const context=await browser.newContext({viewport:{width:1500,height:1100},serviceWorkers:'block'}),errors=[];
    await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>!!window.SulsulTravel?.PhotoCompression);
    const results=await page.evaluate(async()=>{
      const api=window.SulsulTravel.PhotoCompression;
      const blobOf=(canvas,type='image/jpeg',quality=.97)=>new Promise(resolve=>canvas.toBlob(resolve,type,quality));
      async function pixels(blob){const image=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);image.close();return canvas;}
      function generator(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};}
      function paper(ctx,width,height,seed){
        const random=generator(seed);ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,width,height);
        // 밝기 편차는 휴대폰 촬영 문서의 질감만 흉내낸다. 모든 문구와 숫자는 가상이다.
        const image=ctx.getImageData(0,0,width,height);for(let n=0;n<image.data.length;n+=4){const noise=Math.round((random()-.5)*13);image.data[n]=Math.max(0,image.data[n]+noise);image.data[n+1]=Math.max(0,image.data[n+1]+noise);image.data[n+2]=Math.max(0,image.data[n+2]+noise);}
        ctx.putImageData(image,0,0);
      }
      function corners(ctx,width,height){
        const size=Math.min(width,height)*.07;
        for(const [x,y,color]of[[0,0,'#d42223'],[width-size,0,'#1460d2'],[0,height-size,'#159445'],[width-size,height-size,'#e2a500']]){ctx.fillStyle=color;ctx.fillRect(x,y,size,size);}
      }
      function receipt(name,width,height,fontSize){
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');paper(ctx,width,height,35+height);corners(ctx,width,height);
        ctx.fillStyle='#17202a';ctx.font=`bold ${fontSize*1.65}px "Malgun Gothic",sans-serif`;ctx.fillText('가상 영수증 · SYNTHETIC RECEIPT',140,240);
        ctx.font=`${fontSize}px "Malgun Gothic",sans-serif`;ctx.fillText('2030-05-01  14:25  /  SAMPLE ONLY',140,340);
        ctx.fillText('이름·전화·계좌 없는 테스트 자료',140,420);
        const rows=[],step=fontSize*2.15;let row=0;
        for(let y=570;y<height-300;y+=step){const text=`${String(++row).padStart(2,'0')}  가상 상품 / Travel item  ${row%3+1}개    ${(1250+row*370).toLocaleString('en-US')}원`;ctx.fillText(text,140,y);rows.push({x:140,y:y-fontSize,width:width-280,height:fontSize*1.32,fontSize});}
        ctx.strokeStyle='#3f4650';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(140,height-230);ctx.lineTo(width-140,height-230);ctx.stroke();
        ctx.font=`bold ${fontSize*1.25}px "Malgun Gothic",sans-serif`;ctx.fillText('합계 TOTAL        123,450 KRW',140,height-140);
        return{name,canvas,preset:'document',rows};
      }
      function photo(name,width,height,portrait){
        const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),random=generator(portrait?782:231);
        const image=ctx.createImageData(width,height);
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,noise=(random()-.5)*62,horizon=height*.53;let r,g,b;
          if(y<horizon){r=80+95*y/horizon;g=144+45*y/horizon;b=212+26*y/horizon;}else{r=44+47*y/height;g=101+53*y/height;b=45+27*y/height;}
          image.data[i]=r+noise;image.data[i+1]=g+noise;image.data[i+2]=b+noise;image.data[i+3]=255;
        }ctx.putImageData(image,0,0);
        ctx.fillStyle='#344d58';ctx.beginPath();ctx.moveTo(0,height*.57);ctx.lineTo(width*.25,height*.26);ctx.lineTo(width*.48,height*.57);ctx.lineTo(width*.7,height*.35);ctx.lineTo(width,height*.61);ctx.fill();
        for(let i=0;i<170;i++){ctx.strokeStyle=`rgba(236,221,164,${.2+random()*.5})`;ctx.lineWidth=2+random()*6;ctx.beginPath();const x=random()*width,y=height*(.58+random()*.42);ctx.moveTo(x,y);ctx.lineTo(x+20+random()*90,y-15-random()*50);ctx.stroke();}
        if(portrait){
          // 인물 형태는 벡터 도형으로 그린 가상 피사체다.
          ctx.fillStyle='#22385d';ctx.beginPath();ctx.ellipse(width*.5,height*.86,width*.31,height*.27,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#cf9c7b';ctx.beginPath();ctx.ellipse(width*.5,height*.43,width*.20,height*.20,0,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#302e31';ctx.beginPath();ctx.ellipse(width*.5,height*.29,width*.22,height*.13,0,Math.PI,Math.PI*2);ctx.fill();
          for(const x of[width*.43,width*.57]){ctx.beginPath();ctx.ellipse(x,height*.42,width*.016,height*.009,0,0,Math.PI*2);ctx.fill();}
          ctx.strokeStyle='#723e37';ctx.lineWidth=8;ctx.beginPath();ctx.arc(width*.5,height*.48,width*.055,0,Math.PI);ctx.stroke();
        }
        corners(ctx,width,height);return{name,canvas,preset:'photo',rows:[]};
      }
      const fixtures=[receipt('receipt',1800,2700,48),receipt('long-receipt',1800,9000,48),photo('noisy-landscape',3000,2000,false),photo('portrait',2000,3000,true)];
      const small=document.createElement('canvas');small.width=160;small.height=100;const sc=small.getContext('2d');sc.fillStyle='#f8e2a7';sc.fillRect(0,0,160,100);sc.fillStyle='#155a67';sc.fillRect(18,18,124,64);corners(sc,160,100);fixtures.push({name:'already-small-jpeg',canvas:small,preset:'photo',rows:[],quality:.65});
      function sampleColor(canvas,x,y){const d=canvas.getContext('2d').getImageData(Math.round(x),Math.round(y),1,1).data;return Array.from(d).slice(0,3);}
      function cornerChecks(canvas){const {width:w,height:h}=canvas,inset=Math.min(w,h)*.025;return[[inset,inset,'red'],[w-inset,inset,'blue'],[inset,h-inset,'green'],[w-inset,h-inset,'yellow']].map(([x,y,color])=>{const[r,g,b]=sampleColor(canvas,x,y);return{color,rgb:[r,g,b],present:color==='red'?r>g*1.5&&r>b*1.5:color==='blue'?b>r*1.5&&b>g*1.2:color==='green'?g>r*1.5&&g>b*1.2:r>b*2&&g>b*2};});}
      function rowFeatures(canvas,rows,scale){
        const ctx=canvas.getContext('2d');return rows.map(row=>{
          const x=Math.round(row.x*scale),y=Math.round(row.y*scale),width=Math.max(1,Math.round(row.width*scale)),height=Math.max(1,Math.round(row.height*scale));
          const data=ctx.getImageData(x,y,Math.min(width,canvas.width-x),Math.min(height,canvas.height-y)).data;
          let dark=0,light=0,sumDark=0,sumLight=0;
          for(let i=0;i<data.length;i+=4){const l=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];if(l<105){dark++;sumDark+=l;}if(l>210){light++;sumLight+=l;}}
          return {darkFraction:dark/(data.length/4),contrast:dark&&light?sumLight/light-sumDark/dark:0,projectedFontPixels:row.fontSize*scale};
        });
      }
      window.compressionReview=[];const data=[];
      for(const fixture of fixtures){
        const source=await blobOf(fixture.canvas,'image/jpeg',fixture.quality??.97),started=performance.now();
        const compressed=await api.compress(source,{preset:fixture.preset}),elapsedMs=Math.round(performance.now()-started);
        const decoded=await pixels(compressed.source),thumb=await pixels(compressed.thumbnail),sourceDecoded=await pixels(source),scale=decoded.width/fixture.canvas.width;
        const features=rowFeatures(decoded,fixture.rows,scale),originalFeatures=rowFeatures(sourceDecoded,fixture.rows,1),outputBytes=new Uint8Array(await compressed.source.arrayBuffer()),sourceBytes=new Uint8Array(await source.arrayBuffer());
        const row={name:fixture.name,preset:fixture.preset,originalBytes:source.size,compressedBytes:compressed.source.size,thumbnailBytes:compressed.thumbnail.size,savedBytes:source.size-compressed.source.size,savingsPercent:Math.round((1-compressed.source.size/source.size)*1000)/10,originalWidth:fixture.canvas.width,originalHeight:fixture.canvas.height,width:decoded.width,height:decoded.height,thumbnailWidth:thumb.width,thumbnailHeight:thumb.height,reportedWidth:compressed.width,reportedHeight:compressed.height,aspectRelativeError:Math.abs((decoded.width/decoded.height)/(fixture.canvas.width/fixture.canvas.height)-1),corners:cornerChecks(decoded),textRows:features.length,textRowsWithDarkFeatures:features.filter(item=>item.darkFraction>.025&&item.contrast>120).length,minTextContrast:features.length?Math.min(...features.map(item=>item.contrast)):null,minProjectedFontPixels:features.length?Math.min(...features.map(item=>item.projectedFontPixels)):null,originalMinTextContrast:originalFeatures.length?Math.min(...originalFeatures.map(item=>item.contrast)):null,changed:compressed.changed,byteIdentical:outputBytes.length===sourceBytes.length&&outputBytes.every((value,index)=>value===sourceBytes[index]),elapsedMs};
        data.push(row);window.compressionReview.push({name:fixture.name,original:sourceDecoded,compressed:decoded,rows:fixture.rows,metrics:row,source,output:compressed});
      }
      window.compressionTestHelpers={api,blobOf,pixels};return data;
    });
    for(const result of results){
      assert.ok(result.compressedBytes<=result.originalBytes,`${result.name}: 원본보다 커지지 않음`);
      assert.ok(result.width<=result.originalWidth&&result.height<=result.originalHeight,`${result.name}: 확대하지 않음`);
      assert.ok(result.aspectRelativeError<.002,`${result.name}: 종횡비 보존`);
      assert.equal(result.reportedWidth,result.width);assert.equal(result.reportedHeight,result.height);
      assert.ok(result.corners.every(corner=>corner.present),`${result.name}: 네 모서리 보존으로 크롭 없음 확인`);
      assert.ok(Math.max(result.thumbnailWidth,result.thumbnailHeight)<=320,`${result.name}: 작은 썸네일`);
      if(result.textRows){assert.equal(result.textRowsWithDarkFeatures,result.textRows,`${result.name}: 텍스트 행의 명암 특징 유지`);assert.ok(result.minTextContrast>120);assert.ok(result.minProjectedFontPixels>=16,`${result.name}: 합성 본문 출력 글자 크기`);}
      if(result.name==='long-receipt')assert.ok(result.height>=3200,'긴 영수증은 장축 800px로 축소하지 않음');
      if(result.name!=='already-small-jpeg')assert.ok(result.savingsPercent>20,`${result.name}: 고해상도 고품질 원본보다 실질적 용량 절감`);
    }
    const boundaries=await page.evaluate(async()=>{
      const{api}=window.compressionTestHelpers,source=window.compressionReview[0].source;
      async function rejected(work){try{await work();return{rejected:false};}catch(error){return{rejected:true,name:error.name,code:error.code??null,message:error.message};}}
      const tooLarge=await rejected(()=>api.compress(new Blob([new Uint8Array(20*1024*1024+1)],{type:'image/jpeg'}),{preset:'photo'}));
      const badImage=await rejected(()=>api.compress(new Blob(['synthetic invalid image'],{type:'image/jpeg'}),{preset:'document'}));
      const exactLimitInput=new Blob([source,new Uint8Array(20*1024*1024-source.size)],{type:'image/jpeg'});
      const exactLimit=await api.compress(exactLimitInput,{preset:'document'});
      const controller=new AbortController();controller.abort();const aborted=await rejected(()=>api.compress(source,{preset:'document',signal:controller.signal}));
      const smallSource=window.compressionReview.find(item=>item.name==='already-small-jpeg').source,smallExisting=await api.compress(smallSource,{preset:'photo',existing:true});
      const smallBefore=new Uint8Array(await smallSource.arrayBuffer()),smallAfter=new Uint8Array(await smallExisting.source.arrayBuffer());
      const original=HTMLCanvasElement.prototype.toBlob;let timeout;
      try{HTMLCanvasElement.prototype.toBlob=function(){};timeout=await rejected(()=>api.compress(source,{preset:'document',timeoutMs:40}));}finally{HTMLCanvasElement.prototype.toBlob=original;}
      return{tooLarge,badImage,exactLimit:{inputBytes:exactLimitInput.size,outputBytes:exactLimit.source.size,width:exactLimit.width,height:exactLimit.height},aborted,timeout,smallExisting:{changed:smallExisting.changed,byteIdentical:smallBefore.length===smallAfter.length&&smallBefore.every((value,index)=>value===smallAfter[index]),originalBytes:smallSource.size,bytes:smallExisting.source.size}};
    });
    assert.equal(boundaries.tooLarge.rejected,true,'20MiB 초과 입력 거부');assert.equal(boundaries.badImage.rejected,true,'이미지 디코딩 실패 거부');
    assert.equal(boundaries.exactLimit.inputBytes,20*1024*1024);assert.ok(boundaries.exactLimit.outputBytes<boundaries.exactLimit.inputBytes);
    assert.equal(boundaries.aborted.rejected,true,'이미 취소된 작업 거부');assert.equal(boundaries.timeout.rejected,true,'인코더 미응답 타임아웃 거부');
    assert.equal(boundaries.tooLarge.code,'PHOTO_TOO_LARGE');assert.equal(boundaries.badImage.code,'PHOTO_DECODE_FAILED');assert.equal(boundaries.aborted.code,'PHOTO_ABORTED');assert.equal(boundaries.timeout.code,'PHOTO_TIMEOUT');
    assert.equal(boundaries.smallExisting.changed,false);assert.equal(boundaries.smallExisting.byteIdentical,true,'작은 기존 JPEG는 재인코딩하지 않음');
    // 각 결과를 실제 픽셀 크기보다 2배로 확대한 문서 crop으로 나란히 저장한다.
    for(const result of results){
      await page.evaluate(name=>{
        const item=window.compressionReview.find(entry=>entry.name===name),m=item.metrics;
        document.body.replaceChildren();const title=document.createElement('h1');title.textContent=`${name} · 합성 원본과 압축 결과`;
        const note=document.createElement('p');note.textContent=`원본 ${m.originalWidth}×${m.originalHeight}, ${m.originalBytes.toLocaleString()} bytes → 압축 ${m.width}×${m.height}, ${m.compressedBytes.toLocaleString()} bytes (${m.savingsPercent}% 절감). OCR 없이 육안 비교하는 자료입니다. 문서 영역은 출력 픽셀을 2배로 확대했습니다.`;
        document.body.append(title,note);const canvas=document.createElement('canvas');canvas.width=1424;canvas.height=name.includes('receipt')?950:1000;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#17202a';ctx.font='20px "Malgun Gothic",sans-serif';ctx.fillText('ORIGINAL · 같은 영역과 표시 배율',20,32);ctx.fillText('COMPRESSED · 같은 영역과 표시 배율',732,32);
        if(item.rows.length){const sx=130,sy=item.rows[0].y-20,sw=Math.min(340/m.width*m.originalWidth,m.originalWidth-sx),sh=420/m.height*m.originalHeight;ctx.drawImage(item.original,sx,sy,sw,sh,20,60,680,840);ctx.drawImage(item.compressed,sx*m.width/m.originalWidth,sy*m.height/m.originalHeight,sw*m.width/m.originalWidth,sh*m.height/m.originalHeight,732,60,680,840);}
        else{const scale=Math.min(680/m.originalWidth,900/m.originalHeight),w=m.originalWidth*scale,h=m.originalHeight*scale;ctx.drawImage(item.original,0,0,m.originalWidth,m.originalHeight,20,60,w,h);ctx.drawImage(item.compressed,0,0,m.width,m.height,732,60,w,h);}
        document.body.append(canvas);
      },result.name);
      await page.screenshot({path:path.join(out,`${result.name}-comparison.png`),fullPage:true});
      if(result.textRows){
        await page.evaluate(name=>{
          const item=window.compressionReview.find(entry=>entry.name===name),m=item.metrics,canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),sw=340*m.originalWidth/m.width,sh=420*m.originalHeight/m.height,sx=Math.min(m.originalWidth-sw-80,750),sy=item.rows[0].y-20;
          document.querySelector('h1').textContent=`${name} · 금액/영문 확대 비교`;
          ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#17202a';ctx.font='20px "Malgun Gothic",sans-serif';ctx.fillText('ORIGINAL · 같은 영역과 표시 배율',20,32);ctx.fillText('COMPRESSED · 같은 영역과 표시 배율',732,32);
          ctx.drawImage(item.original,sx,sy,sw,sh,20,60,680,840);ctx.drawImage(item.compressed,sx*m.width/m.originalWidth,sy*m.height/m.originalHeight,sw*m.width/m.originalWidth,sh*m.height/m.originalHeight,732,60,680,840);
        },result.name);
        await page.screenshot({path:path.join(out,`${result.name}-amount-detail.png`),fullPage:true});
      }
    }
    assert.deepEqual(errors,[]);
    const report={passed:true,syntheticOnly:true,actualBrowser:'Chromium/Edge via Playwright',scope:'Independent production compression module; no external requests or personal browser data',readabilityMethod:'Visual enlarged comparison plus source/output dimensions, preserved colored corner markers, projected synthetic font pixels, per-text-row dark feature presence and luminance contrast. No OCR and no claim of real receipt transcription accuracy.',fixtures:results,boundaries,runtimeErrors:errors};
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
