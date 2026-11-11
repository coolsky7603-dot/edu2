/* Budget lens — no network dependencies; opens directly from index.html. */
(() => {
'use strict';
const DATA = window.DASHBOARD_DATA;
const $ = id => document.getElementById(id);
const palette = ['#5078F4','#9A80EA','#17B7A2','#F394AF','#F4AE62','#64B7DF','#A5BE68','#BF90CA'];
const sectorColors = {'전력운영':'#5078F4','방위력개선':'#9A80EA','병무행정':'#17B7A2'};
const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = n => Math.round(n).toLocaleString('ko-KR');
const pct = n => n === null || !Number.isFinite(n) ? '—' : `${n>0?'+':''}${(n*100).toFixed(1)}%`;
const signed = n => `${n>0?'+':''}${num(n)}`;
const money = n => {const a=Math.abs(n);return `${n<0?'−':''}${a>=10000?`${Math.floor(a/10000)}조 ${num(a%10000)}억`:`${num(a)}억`}`;};
const short = n => Math.abs(n)>=10000 ? `${(n/10000).toFixed(Math.abs(n)>=100000?0:1)}조` : num(n);
const label = r => r.program || r.account;
const tip = text => `data-tip="${esc(text)}"`;
const sum = (rows,key) => rows.reduce((a,r)=>a+r[key],0);
const group = (rows,key) => {
 const map=new Map();rows.forEach(r=>{const k=typeof key==='function'?key(r):r[key];if(!map.has(k))map.set(k,{name:k,y2026:0,y2027:0,delta:0,count:0});const g=map.get(k);g.y2026+=r.y2026;g.y2027+=r.y2027;g.delta+=r.delta;g.count++;});return [...map.values()];
};
const svg = (body,w=600,h=270,title='예산 그래프') => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${body}</svg>`;
const text = (x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra.includes('fill=')?'':'fill="#8790A8"'} font-size="10" ${extra}>${esc(t)}</text>`;
const line = (x1,y1,x2,y2,extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra.includes('stroke=')?'':'stroke="#EDF0F6"'} ${extra}/>`;
const noChart = ()=>'<div style="height:100%;display:grid;place-items:center;color:#9AA3B5;font-size:12px">표시할 양수 재원이 없습니다</div>';
let current=[], sortKey='y2027', direction=-1;

function sectorChart(rows){
 const g=group(rows,'sector'),w=650,h=270,left=65,right=20,top=25,bottom=43,max=Math.max(...g.flatMap(x=>[x.y2026,x.y2027]),1),min=Math.min(...g.flatMap(x=>[x.y2026,x.y2027]),0),range=max-min||1;
 const y=n=>top+(max-n)/range*(h-top-bottom),zero=y(0);let s='';
 for(let i=0;i<=4;i++){const n=min+range*i/4,yy=y(n);s+=line(left,yy,w-right,yy)+text(left-12,yy+3,short(n),'text-anchor="end"');}
 const step=(w-left-right)/Math.max(g.length,1),bar=Math.min(43,step*.22);
 g.forEach((d,i)=>{const x=left+step*(i+.5);[['y2026','#B8A4FF',-bar-3],['y2027','#5078F4',3]].forEach(([key,color,off])=>{const n=d[key],yy=y(n);s+=`<rect x="${x+off}" y="${Math.min(yy,zero)}" width="${bar}" height="${Math.max(Math.abs(zero-yy),1)}" rx="5" fill="${color}" ${tip(`${d.name}\n${key==='y2026'?'2026년':'2027년'} ${num(n)}억 원`)}/>`;});s+=text(x,h-17,d.name,'text-anchor="middle"');});
 $('sectorChart').innerHTML=svg(s,w,h,'부문별 2026년과 2027년 예산 비교');
}
function donutChart(rows){
 const g=group(rows.filter(r=>r.y2027>0),'account'),total=g.reduce((a,x)=>a+x.y2027,0);if(!total){$('donutChart').innerHTML=noChart();return;}
 const w=420,h=290,cx=210,cy=107,r=75,C=2*Math.PI*r;let offset=0,s=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F1F3F9" stroke-width="27"/>`;
 g.forEach((d,i)=>{const len=d.y2027/total*C;s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${palette[i]}" stroke-width="27" stroke-dasharray="${Math.max(len-3,0)} ${C}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" ${tip(`${d.name}\n${num(d.y2027)}억 원 · ${(d.y2027/total*100).toFixed(1)}%`)}/>`;offset+=len;});
 s+=text(cx,cy-6,'2027년 양수 재원','text-anchor="middle"')+`<text x="${cx}" y="${cy+20}" text-anchor="middle" fill="#263453" font-size="21" font-weight="700">${esc(money(total))}</text>`;
 g.forEach((d,i)=>{const yy=222+i*27;s+=`<circle cx="38" cy="${yy-3}" r="5" fill="${palette[i]}"/>`+text(52,yy,d.name)+text(383,yy,`${(d.y2027/total*100).toFixed(1)}%`,'text-anchor="end" fill="#344566"');});
 $('donutChart').innerHTML=svg(s,w,h,'회계구분별 2027년 양수 재원 구성');
}
function rankingChart(rows){
 const g=rows.filter(r=>r.y2027>0).sort((a,b)=>b.y2027-a.y2027).slice(0,8);if(!g.length){$('rankingChart').innerHTML=noChart();return;}
 const w=560,h=270,left=166,span=295,max=g[0].y2027;let s='';
 g.forEach((r,i)=>{const yy=14+i*32;s+=text(left-12,yy+15,label(r).length>17?label(r).slice(0,16)+'…':label(r),'text-anchor="end"');s+=`<rect x="${left}" y="${yy}" width="${span}" height="21" rx="5" fill="#F4F6FC"/><rect x="${left}" y="${yy}" width="${Math.max(r.y2027/max*span,2)}" height="21" rx="5" fill="${palette[i]}" ${tip(`${r.sector} / ${label(r)}\n2027년 ${num(r.y2027)}억 원\n증감 ${signed(r.delta)}억 원 (${pct(r.rate)})`)}/>`+text(w-4,yy+15,num(r.y2027),'text-anchor="end"');});
 $('rankingChart').innerHTML=svg(s,w,h,'2027년 예산 상위 8개 프로그램');
}
function changeChart(rows){
 const g=[...rows].sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,8);const w=560,h=270,left=166,zero=300,half=150,max=Math.max(...g.map(r=>Math.abs(r.delta)),1);let s=line(zero,0,zero,265,'stroke="#DCE3F1"');
 g.forEach((r,i)=>{const yy=14+i*32,len=Math.abs(r.delta)/max*half,xx=r.delta<0?zero-len:zero;s+=text(left-12,yy+15,label(r).length>14?label(r).slice(0,13)+'…':label(r),'text-anchor="end"');s+=`<rect x="${xx}" y="${yy}" width="${Math.max(len,1)}" height="21" rx="4" fill="${r.delta<0?'#F394AF':'#17B7A2'}" ${tip(`${r.sector} / ${label(r)}\n증감 ${signed(r.delta)}억 원\n증감률 ${pct(r.rate)}`)}/>`+text(w-4,yy+15,signed(r.delta),'text-anchor="end"');});
 $('changeChart').innerHTML=svg(s,w,h,'절대 증감액 상위 8개 항목');
}
function treemap(rows){
 let g=rows.filter(r=>r.y2027>0).sort((a,b)=>b.y2027-a.y2027).map(r=>({name:label(r),value:r.y2027,sector:r.sector}));if(!g.length){$('treemapChart').innerHTML=noChart();return;}
 if(g.length>12)g=[...g.slice(0,11),{name:'기타 프로그램',value:g.slice(11).reduce((a,r)=>a+r.value,0),sector:''}];
 const bands=[[],[],[]];let j=0,total=g.reduce((a,r)=>a+r.value,0),running=0;
 g.forEach((r,i)=>{if(j<2&&running>total*(j+1)/3&&bands[j].length)j++;bands[j].push({...r,color:palette[i%palette.length]});running+=r.value;});
 $('treemapChart').innerHTML=bands.filter(a=>a.length).map(b=>`<div class="tree-row" style="flex:${b.reduce((a,r)=>a+r.value,0)}">${b.map(r=>`<div class="tile" style="flex:${r.value};background:${r.color}" ${tip(`${r.name}\n${num(r.value)}억 원 · ${(r.value/total*100).toFixed(1)}%`)}><strong>${esc(r.name)}</strong><small>${esc(short(r.value))}</small></div>`).join('')}</div>`).join('');
}
function slopeChart(rows){
 const g=group(rows.filter(r=>r.y2027>=0&&r.y2026>=0),r=>r.category||r.program||r.account).sort((a,b)=>b.y2027-a.y2027).slice(0,7);if(!g.length){$('slopeChart').innerHTML=noChart();return;}
 const w=430,h=285,left=154,end=350,max=Math.max(...g.flatMap(r=>[r.y2026,r.y2027]),1),x=n=>left+n/max*(end-left);let s=text(left,13,'● 2026년')+text(end,13,'2027년 ●','text-anchor="end"');
 g.forEach((r,i)=>{const yy=44+i*34;s+=text(left-12,yy+3,r.name.length>13?r.name.slice(0,12)+'…':r.name,'text-anchor="end"');s+=line(left,yy,end,yy);s+=`<line x1="${x(r.y2026)}" y1="${yy}" x2="${x(r.y2027)}" y2="${yy}" stroke="${palette[i]}" stroke-width="5" stroke-linecap="round"/><circle cx="${x(r.y2026)}" cy="${yy}" r="4" fill="white" stroke="${palette[i]}" stroke-width="2" ${tip(`${r.name}\n2026년 ${num(r.y2026)}억 원`)}/><circle cx="${x(r.y2027)}" cy="${yy}" r="6" fill="${palette[i]}" ${tip(`${r.name}\n2027년 ${num(r.y2027)}억 원\n증감 ${signed(r.delta)}억 원`)}/>`;s+=text(w-1,yy+3,short(r.y2027),'text-anchor="end"');});
 $('slopeChart').innerHTML=svg(s,w,h,'상위 구분별 2026년에서 2027년 예산 이동');
}
function scatterChart(rows){
 const g=rows.filter(r=>r.y2027>0&&r.y2026>0&&r.rate!==null);if(!g.length){$('scatterChart').innerHTML=noChart();return;}
 const w=650,h=280,left=53,right=26,top=18,bottom=41,maxX=Math.max(...g.map(r=>r.y2027),1)*1.08,minY=Math.min(...g.map(r=>r.rate),0)-.07,maxY=Math.max(...g.map(r=>r.rate),.1)+.07;
 const x=n=>left+n/maxX*(w-left-right),y=n=>top+(maxY-n)/(maxY-minY)*(h-top-bottom);let s='';
 for(let i=0;i<=4;i++){const xx=x(maxX*i/4),v=minY+(maxY-minY)*i/4,yy=y(v);s+=line(xx,top,xx,h-bottom)+text(xx,h-bottom+20,short(maxX*i/4),'text-anchor="middle"');s+=line(left,yy,w-right,yy)+text(left-8,yy+4,`${(v*100).toFixed(0)}%`,'text-anchor="end"');}
 s+=line(left,y(0),w-right,y(0),'stroke-dasharray="4 4" stroke="#BFC9DD"');
 g.forEach(r=>{const rad=5+Math.sqrt(r.y2027/maxX)*16;s+=`<circle cx="${x(r.y2027)}" cy="${y(r.rate)}" r="${rad}" fill="${sectorColors[r.sector]}" fill-opacity=".72" stroke="white" stroke-width="2" ${tip(`${r.sector} / ${label(r)}\n2027년 ${num(r.y2027)}억 원\n증감률 ${pct(r.rate)}`)}/>`;});
 $('scatterChart').innerHTML=svg(s,w,h,'프로그램 예산 규모와 증감률 산점도');
 document.querySelector('.sector-legend').innerHTML=[...new Set(g.map(r=>r.sector))].map(s=>`<span><i style="background:${sectorColors[s]}"></i>${esc(s)}</span>`).join('');
}
function heatmap(rows){
 const sectors=[...new Set(rows.map(r=>r.sector))],accounts=[...new Set(rows.map(r=>r.account))],max=Math.max(...rows.map(r=>Math.abs(r.y2027)),1),cols=`80px repeat(${accounts.length},minmax(0,1fr))`;
 let html=`<div class="heat-row" style="grid-template-columns:${cols}"><span></span>${accounts.map(a=>`<span>${esc(a)}</span>`).join('')}</div>`;
 sectors.forEach(s=>{html+=`<div class="heat-row" style="grid-template-columns:${cols}"><span>${esc(s)}</span>${accounts.map(a=>{const matches=rows.filter(r=>r.sector===s&&r.account===a),n=sum(matches,'y2027'),opacity=.12+.78*Math.min(Math.abs(n)/max,1);return `<span class="heat-cell" style="background:${matches.length?(n<0?`rgba(243,148,175,${opacity})`:`rgba(80,120,244,${opacity})`):'#F6F7FB'};color:${opacity>.6?'white':'#566787'}" ${tip(`${s} / ${a}\n${matches.length?`${num(n)}억 원`:'해당 항목 없음'}`)}>${matches.length?esc(short(n)):'—'}</span>`;}).join('')}</div>`;});
 html+='<div style="text-align:right;font-size:9px;color:#939DB1;margin-top:12px">연한 색 ← 작은 금액 · 큰 금액 → 진한 색</div>';$('heatmapChart').innerHTML=html;
}
function renderTable(rows){
 const sorted=[...rows].sort((a,b)=>{let av=a[sortKey],bv=b[sortKey];if(av===null)av=-Infinity;if(bv===null)bv=-Infinity;return (typeof av==='string'?av.localeCompare(bv,'ko'):av-bv)*direction;});
 document.querySelector('#details tbody').innerHTML=sorted.map(r=>`<tr><td>${esc(r.sector)}</td><td><span class="account-badge">${esc(r.account)}</span></td><td>${esc(r.category||'—')}</td><td>${esc(label(r))}</td><td class="num">${num(r.y2026)}</td><td class="num">${num(r.y2027)}</td><td class="num ${r.delta<0?'negative':'positive'}">${signed(r.delta)}</td><td class="num ${r.rate<0?'negative':'positive'}">${pct(r.rate)}</td></tr>`).join('');
 const a=sum(rows,'y2026'),b=sum(rows,'y2027');document.querySelector('#details tfoot').innerHTML=`<tr><td colspan="4">선택 항목 합계 · ${rows.length}개</td><td class="num">${num(a)}</td><td class="num">${num(b)}</td><td class="num">${signed(b-a)}</td><td class="num">${pct(a?(b-a)/a:null)}</td></tr>`;
 $('tableCount').textContent=`${rows.length}개`;
 document.querySelectorAll('th[data-key]').forEach(th=>th.setAttribute('aria-sort',th.dataset.key===sortKey?(direction>0?'ascending':'descending'):'none'));
}
function refreshAccounts(){
 const keep=$('account').value,sector=$('sector').value;
 const accounts=[...new Set(DATA.filter(r=>!sector||r.sector===sector).map(r=>r.account))];
 $('account').innerHTML='<option value="">전체 회계</option>'+accounts.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');
 if(accounts.includes(keep))$('account').value=keep;
}
function render(){
 const sector=$('sector').value,account=$('account').value,q=$('search').value.trim().toLowerCase();
 current=DATA.filter(r=>(!sector||r.sector===sector)&&(!account||r.account===account)&&(!q||`${r.program} ${r.category} ${r.account}`.toLowerCase().includes(q)));
 const a=sum(current,'y2026'),b=sum(current,'y2027'),d=b-a;
 $('total26').textContent=money(a);$('total27').textContent=money(b);$('delta').textContent=`${d>0?'+':''}${money(d)}`;$('rate').textContent=pct(a?d/a:null);
 $('deltaCaption').textContent=`2026년 대비 ${d>0?'증가':d<0?'감소':'변동 없음'}`;
 $('selection').textContent=`${sector||'전체 부문'} · ${account||'전체 회계'}`;
 $('scope').textContent=sector||account?`${sector||'전체 부문'} / ${account||'전체 회계'}`:'전체 재원 분석';
 $('count').textContent=current.length;$('empty').hidden=current.length>0;$('charts').hidden=current.length===0;
 if(current.length){sectorChart(current);donutChart(current);rankingChart(current);changeChart(current);treemap(current);slopeChart(current);scatterChart(current);heatmap(current);}
 renderTable(current);
}
$('sector').innerHTML+=[...new Set(DATA.map(r=>r.sector))].map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
$('sector').addEventListener('change',()=>{refreshAccounts();render();});$('account').addEventListener('change',render);$('search').addEventListener('input',render);
$('filters').addEventListener('submit',e=>e.preventDefault());$('filters').addEventListener('reset',()=>setTimeout(()=>{refreshAccounts();render();},0));
document.querySelectorAll('th[data-key]').forEach(th=>{th.tabIndex=0;const run=()=>{if(sortKey===th.dataset.key)direction*=-1;else{sortKey=th.dataset.key;direction=typeof DATA[0][sortKey]==='number'?-1:1;}renderTable(current);};th.addEventListener('click',run);th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}});});
$('download').addEventListener('click',()=>{const quote=v=>`"${String(v??'').replace(/"/g,'""')}"`;const lines=[['부문','회계구분','구분','프로그램명','2026년(억원)','2027년(억원)','증감(억원)','증감률(%)'],...current.map(r=>[r.sector,r.account,r.category,r.program,r.y2026,r.y2027,r.delta,r.rate===null?'':(r.rate*100).toFixed(3)])];const blob=new Blob(['\uFEFF'+lines.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='국방예산_필터결과.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const tooltip=$('tooltip');document.addEventListener('pointermove',e=>{const target=e.target.closest('[data-tip]');if(!target){tooltip.style.display='none';return;}tooltip.textContent=target.dataset.tip;tooltip.style.display='block';tooltip.style.left=Math.min(e.clientX+15,window.innerWidth-tooltip.offsetWidth-12)+'px';tooltip.style.top=Math.max(8,Math.min(e.clientY+14,window.innerHeight-tooltip.offsetHeight-12))+'px';});document.addEventListener('pointerleave',()=>tooltip.style.display='none');
refreshAccounts();render();
window.BudgetDashboard={getFilteredRows:()=>current.map(r=>({...r})),totals:()=>({y2026:sum(current,'y2026'),y2027:sum(current,'y2027')}),render};
})();
