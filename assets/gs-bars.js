/* gs-bars.js: shared top bar + bottom bar behavior for geoffreyserdar.com.
   Source: /workspace/house-chrome/_partials/gs-bars/. Numbers come only from /data/weekly-towns.json,
   which the Monday weekly deploy refreshes, so nothing here goes stale. */
(function(){
  var me=document.currentScript||document.querySelector('script[src*="gs-bars.js"]');
  var mode=(me&&me.getAttribute('data-mode'))||'seller';
  var town=(me&&me.getAttribute('data-town'))||'';
  /* Desktop bars (Geoffrey yes 2026-10-27): slim top bar + bottom-right pill at 768px and up. Mobile CSS untouched. */
  if(!document.getElementById('gs-desk-css')){var st=document.createElement('style');st.id='gs-desk-css';st.textContent="@media (min-width:768px){\n.gs-top{display:flex;align-items:center;justify-content:center;gap:12px;position:fixed;top:0;left:0;right:0;z-index:9998;height:40px;padding:0 20px;background:rgba(29,30,26,.94);color:#fff;font:500 13px/1.2 'Inter',system-ui,sans-serif;letter-spacing:.2px;transform:translateY(0);transition:transform .25s ease;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}\n.gs-top.gs-hide{transform:translateY(-100%)}\n.gs-top a{color:#fff;text-decoration:none}\n.gs-top .gs-mark{flex:0 0 auto;overflow:hidden;display:flex;width:28px!important;height:28px!important;box-sizing:border-box;border:1px solid #C9A877;border-radius:50%}\n.gs-top .gs-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.gs-top .gs-line b{color:#C9A877;font-weight:600}\n.gs-top .gs-line:hover b{text-decoration:underline}\nbody{padding-top:40px}\n#signup,#sv-offer{scroll-margin-top:56px}\n.sv-bar{display:flex;flex-direction:column;align-items:stretch;position:fixed;right:14px;bottom:20px;left:auto;z-index:9997;gap:6px;padding:6px;border-radius:22px;background:rgba(29,30,26,.94);box-shadow:0 6px 24px rgba(0,0,0,.18);transition:opacity .25s ease,transform .25s ease}\n.sv-bar a{display:flex;align-items:center;justify-content:center;min-height:36px;padding:0 14px;border-radius:999px;font:600 13px 'Inter',system-ui,sans-serif;text-decoration:none;color:#fff;border:1px solid rgba(255,255,255,.35);white-space:nowrap}\n.sv-bar a.sv-main{background:#b08d57;border-color:transparent}\n.sv-bar a:hover{filter:brightness(1.08)}\n.sv-bar.sv-off{opacity:0;transform:translateY(12px);pointer-events:none}\n}";(document.head||document.documentElement).appendChild(st)}
  var bar=document.getElementById('gsTop'), line=document.getElementById('gsTopLine');
  /* Face mark (Geoffrey 2026-10-26): swap the GS initials for his headshot. 120px source (crop C) for a 40px circle in a 52px bar. */
  (function(){var m=bar&&bar.querySelector('.gs-mark');if(!m||m.querySelector('img'))return;
    var im=new Image();im.alt='Geoffrey Serdar';im.width=40;im.height=40;im.decoding='async';
    im.style.cssText='width:100%;height:100%;border-radius:50%;object-fit:cover;display:block';
    im.onload=function(){m.textContent='';m.appendChild(im);m.style.overflow='hidden';m.style.padding='0';m.style.borderWidth='1.5px';m.style.width='40px';m.style.height='40px';m.style.boxSizing='border-box'};
    im.src='https://geoffreyserdar.com/img/geoffrey-face-120c.jpg';})();
  function ev(name,label){try{if(typeof gtag==='function')gtag('event',name,{link_text:label,page_path:location.pathname})}catch(e){}}
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
  function set(html,href){if(!line)return;line.innerHTML=html;if(href)line.setAttribute('href',href)}
  if(bar){
    bar.addEventListener('click',function(e){var a=e.target.closest('a');if(a)ev('top_bar_click',(a.textContent||'').trim())});
    if(mode==='care'){set('Questions? <b>Text Geoffrey</b>','sms:+19522583100')}
    else if(mode==='weekly'){set('<b>Get this list weekly</b>','#signup')}
    else{
      fetch('/data/weekly-towns.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null}).then(function(d){
        if(!d||!d.weeks||!d.weeks.length)return;
        var w=d.weeks[d.weeks.length-1];
        var end=new Date(w.week_end+'T23:59:59');
        if(isNaN(end)||(Date.now()-end.getTime())>13*864e5)return; /* stale week: keep the no-number line */
        var lake=w.lake_ring&&w.lake_ring.n_sold, t=town&&w.towns&&w.towns[town], tn=t&&t.n;
        var es=(mode==='buyer-es');
        if(tn>=1&&!es){set(esc(tn)+' '+esc(town)+' sale'+(tn>1?'s':'')+' last week · <b>See the list</b>')}
        else if(lake>=1){set(es?esc(lake)+' casas vendidas en el lago la semana pasada · <b>Ver lista</b>':esc(lake)+' lake homes sold last week · <b>See the list</b>')}
      }).catch(function(){});
    }
    /* hide on scroll down, show on scroll up; hide while typing in a form */
    var last=window.scrollY||0, sticky=null;
    try{var c=document.querySelectorAll('header,nav,.topbar,.site-head,.nav');for(var i=0;i<c.length;i++){var cs=getComputedStyle(c[i]);if(c[i]!==bar&&(cs.position==='sticky'||cs.position==='fixed')&&parseInt(cs.top||'1',10)===0&&!c[i].classList.contains('sv-bar')){sticky=c[i];break}}}catch(e){}
    function place(){if(!sticky)return;var mob=window.matchMedia('(max-width:767.98px)').matches;sticky.style.transition='top .25s ease';sticky.style.top=(!bar.classList.contains('gs-hide'))?bar.getBoundingClientRect().height+'px':'0px'}
    function onScroll(){var y=window.scrollY||0,typing=document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if(typing||(y>last+4&&y>60))bar.classList.add('gs-hide');else if(y<last-4||y<=60)bar.classList.remove('gs-hide');last=y;place()}
    window.addEventListener('scroll',onScroll,{passive:true});
    document.addEventListener('focusin',onScroll);document.addEventListener('focusout',function(){setTimeout(onScroll,50)});
    window.addEventListener('resize',place);place();
  }
  var sb=document.querySelector('nav.sv-bar');
  if(sb)sb.addEventListener('click',function(e){var a=e.target.closest('a');if(a)ev('bottom_bar_click',(a.textContent||'').trim())});
  if(sb){
    /* desktop: sms links are clumsy on computers, so the second pill shows the number itself; restore on mobile */
    var dq=window.matchMedia('(min-width:768px)'), sec=sb.querySelector('a[href^="sms:"]'), orig=sec&&sec.textContent;
    function lab(){if(sec)sec.textContent=dq.matches?'Text 952 258 3100':orig}
    lab();if(dq.addEventListener)dq.addEventListener('change',lab);
    /* desktop: the pill only shows where it covers nothing. It hides over text, images, links, forms and the footer. */
    var CT=/^(IMG|PICTURE|VIDEO|IFRAME|CANVAS|SVG|INPUT|TEXTAREA|SELECT|BUTTON|A|LABEL|FOOTER)$/;
    function isContent(el){for(var n=el;n&&n!==document.body;n=n.parentElement){if(CT.test(n.tagName.toUpperCase())||n.id==='sv-offer'||n.classList.contains('site-footer'))return true}
      for(var k=el.firstChild;k;k=k.nextSibling){if(k.nodeType===3&&/\S/.test(k.nodeValue))return true}return false}
    var tick=0;function cover(){tick=0;if(!dq.matches){sb.classList.remove('sv-off');return}
      var r=sb.getBoundingClientRect(),hit=(window.innerHeight+(window.scrollY||0))>=document.documentElement.scrollHeight-360;sb.style.pointerEvents='none';
      for(var xi=0;xi<4&&!hit;xi++)for(var yi=0;yi<4&&!hit;yi++){var el=document.elementFromPoint(r.left+2+(r.width-4)*xi/3,r.top+2+(r.height-4)*yi/3);if(el&&!sb.contains(el)&&el!==document.documentElement&&el!==document.body&&isContent(el))hit=true}
      sb.style.pointerEvents='';sb.classList.toggle('sv-off',hit)}
    function q(){if(!tick)tick=requestAnimationFrame(cover)}
    window.addEventListener('scroll',q,{passive:true});window.addEventListener('resize',q);window.addEventListener('load',q);setTimeout(cover,300);
  }
})();
