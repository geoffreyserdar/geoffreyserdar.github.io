/* gs-bars.js: shared top bar + bottom bar behavior for geoffreyserdar.com.
   Source: /workspace/house-chrome/_partials/gs-bars/. Numbers come only from /data/weekly-towns.json,
   which the Monday weekly deploy refreshes, so nothing here goes stale. */
(function(){
  var me=document.currentScript||document.querySelector('script[src*="gs-bars.js"]');
  var mode=(me&&me.getAttribute('data-mode'))||'seller';
  var town=(me&&me.getAttribute('data-town'))||'';
  var bar=document.getElementById('gsTop'), line=document.getElementById('gsTopLine');
  /* Face mark (Geoffrey 2026-10-26): swap the GS initials for his headshot. 96px source for a 30px slot. */
  (function(){var m=bar&&bar.querySelector('.gs-mark');if(!m||m.querySelector('img'))return;
    var im=new Image();im.alt='Geoffrey Serdar';im.width=30;im.height=30;im.decoding='async';
    im.style.cssText='width:100%;height:100%;border-radius:50%;object-fit:cover;display:block';
    im.onload=function(){m.textContent='';m.appendChild(im);m.style.overflow='hidden';m.style.padding='0';m.style.borderWidth='1.5px'};
    im.src='https://geoffreyserdar.com/img/geoffrey-face-96.jpg';})();
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
    function place(){if(!sticky)return;var mob=window.matchMedia('(max-width:767.98px)').matches;sticky.style.transition='top .25s ease';sticky.style.top=(mob&&!bar.classList.contains('gs-hide'))?bar.getBoundingClientRect().height+'px':'0px'}
    function onScroll(){var y=window.scrollY||0,typing=document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if(typing||(y>last+4&&y>60))bar.classList.add('gs-hide');else if(y<last-4||y<=60)bar.classList.remove('gs-hide');last=y;place()}
    window.addEventListener('scroll',onScroll,{passive:true});
    document.addEventListener('focusin',onScroll);document.addEventListener('focusout',function(){setTimeout(onScroll,50)});
    window.addEventListener('resize',place);place();
  }
  var sb=document.querySelector('nav.sv-bar');
  if(sb)sb.addEventListener('click',function(e){var a=e.target.closest('a');if(a)ev('bottom_bar_click',(a.textContent||'').trim())});
})();
