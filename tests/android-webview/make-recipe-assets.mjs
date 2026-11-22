import {copyFile,writeFile} from 'node:fs/promises';
import {recipePage} from '../fixtures/google-recipes.mjs';
const out=process.argv[3];
await copyFile('/tmp/recipes-release/android-generic-autopager.user.js',out+'/script-current.js');
await copyFile('Android_Generic_AutoPager_v6.72.js',out+'/script-control.js');
await writeFile(out+'/fixture-end.html','<title>End</title>');
for(let start=0;start<300;start+=10){
 let html=recipePage(start).replaceAll('サーモンキャンディ&amp;start=', 'mobile-result-frames&amp;start=').replaceAll('/salmon.svg','data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22/%3E');
 html=html.replace('</head>','<style>[data-keep="article"]{min-height:65vh}[data-keep="questions"]{min-height:60vh}</style></head>');
 if(!start)html=html.replace('</head>','<script src="/fixture-userscript.js"></script></head>').replace('</body>','<script src="/fixture-probe.js"></script></body>');
 await writeFile(out+'/fixture-captured-light-'+start+'.html',html);
}
await writeFile(out+'/probe.js',`const scrolling=setInterval(()=>scrollTo(0,document.documentElement.scrollHeight),150);
window.__autoPagerFixture={scroll(){},snapshot(){
 clearInterval(scrolling);
 const sections=[...document.querySelectorAll('.generic-autopager-page')];
 return {pages:[document.querySelector('#rso'),...sections].map((root,i)=>{
 const own=sel=>[...root.querySelectorAll(sel)].filter(n=>i?n.closest('.generic-autopager-page')===root:!n.closest('.generic-autopager-page'));
 const visible=sel=>own(sel).filter(n=>n.getClientRects().length);
 return {cards:visible('[data-recipe-card]').length,head:visible('[data-recipe-heading]').length,foot:visible('[data-recipe-more],[data-recipe-feedback]').length,kept:visible('[data-keep]').map(n=>n.dataset.keep),domCards:own('[data-recipe-card]').length};
 })};
}};`);
