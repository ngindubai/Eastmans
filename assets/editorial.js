(function(){
  'use strict';
  document.documentElement.classList.remove('no-js');

  var header=document.querySelector('.site-header');
  function setHeader(){if(header)header.classList.toggle('scrolled',window.scrollY>16)}
  setHeader();
  addEventListener('scroll',setHeader,{passive:true});

  var toggle=document.querySelector('.menu-toggle');
  var mobile=document.querySelector('.mobile-nav');
  var lastFocus=null;
  function setMenu(open){
    if(!toggle||!mobile)return;
    mobile.classList.toggle('open',open);
    mobile.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.textContent=open?'CLOSE':'MENU';
    document.body.classList.toggle('nav-open',open);
    if(open){lastFocus=document.activeElement;var first=mobile.querySelector('a');if(first)setTimeout(function(){first.focus()},30)}
    else if(lastFocus&&lastFocus.focus)lastFocus.focus();
  }
  if(toggle){toggle.addEventListener('click',function(){setMenu(toggle.getAttribute('aria-expanded')!=='true')})}
  if(mobile){mobile.addEventListener('click',function(e){if(e.target.closest('a'))setMenu(false)})}
  addEventListener('keydown',function(e){if(e.key==='Escape'&&toggle&&toggle.getAttribute('aria-expanded')==='true')setMenu(false)});

  var reveals=[].slice.call(document.querySelectorAll('[data-reveal]'));
  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    var observer=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
    reveals.forEach(function(el){observer.observe(el)});
  }else{reveals.forEach(function(el){el.classList.add('visible')})}

  document.querySelectorAll('[data-carousel]').forEach(function(root){
    var track=root.querySelector('.carousel-track');
    var slides=[].slice.call(root.querySelectorAll('.carousel-slide'));
    var prev=root.querySelector('[data-prev]');
    var next=root.querySelector('[data-next]');
    var count=root.querySelector('[data-count]');
    var autoplayToggle=root.querySelector('[data-autoplay-toggle]');
    var autoplayDelay=parseInt(root.getAttribute('data-autoplay'),10)||0;
    var reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var index=0,startX=0,currentX=0,dragging=false;
    var autoplayTimer=null,pausedByUser=false;
    if(!track||slides.length<2)return;
    function visibleCount(){
      if(!root.classList.contains('card-carousel'))return 1;
      if(innerWidth>=981)return 4;
      if(innerWidth>=760)return 2;
      return 1;
    }
    function maxIndex(){return Math.max(0,slides.length-visibleCount())}
    function stepSize(){return slides.length>1?slides[1].offsetLeft-slides[0].offsetLeft:root.clientWidth}
    function update(){
      index=Math.min(index,maxIndex());
      track.style.transform='translate3d(-'+(index*stepSize())+'px,0,0)';
      if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(maxIndex()+1).padStart(2,'0');
      if(prev)prev.disabled=!autoplayDelay&&index===0;
      if(next)next.disabled=!autoplayDelay&&index===maxIndex();
      slides.forEach(function(slide,i){slide.setAttribute('aria-hidden',String(i<index||i>=index+visibleCount()))});
    }
    function move(delta){
      var target=index+delta;
      if(autoplayDelay){if(target>maxIndex())target=0;if(target<0)target=maxIndex()}
      else target=Math.max(0,Math.min(maxIndex(),target));
      index=target;
      update();
    }
    function clearAutoplay(){if(autoplayTimer){clearTimeout(autoplayTimer);autoplayTimer=null}}
    function scheduleAutoplay(){
      clearAutoplay();
      if(!autoplayDelay||reducedMotion||pausedByUser||document.hidden||root.matches(':hover')||root.matches(':focus-within'))return;
      autoplayTimer=setTimeout(function(){move(1);scheduleAutoplay()},autoplayDelay);
    }
    if(prev)prev.addEventListener('click',function(){move(-1);scheduleAutoplay()});
    if(next)next.addEventListener('click',function(){move(1);scheduleAutoplay()});
    if(autoplayToggle){
      if(reducedMotion){pausedByUser=true;autoplayToggle.textContent='Play';autoplayToggle.setAttribute('aria-pressed','true')}
      autoplayToggle.addEventListener('click',function(){
        pausedByUser=!pausedByUser;
        autoplayToggle.textContent=pausedByUser?'Play':'Pause';
        autoplayToggle.setAttribute('aria-pressed',String(pausedByUser));
        scheduleAutoplay();
      });
    }
    root.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'&&prev)prev.click();if(e.key==='ArrowRight'&&next)next.click()});
    track.addEventListener('pointerdown',function(e){if(e.pointerType==='mouse')return;dragging=true;startX=e.clientX;currentX=e.clientX;track.setPointerCapture(e.pointerId)});
    track.addEventListener('pointermove',function(e){if(dragging)currentX=e.clientX});
    track.addEventListener('pointerup',function(){if(!dragging)return;var delta=currentX-startX;dragging=false;if(Math.abs(delta)>45){if(delta<0&&next)next.click();if(delta>0&&prev)prev.click()}});
    root.addEventListener('mouseenter',clearAutoplay);
    root.addEventListener('mouseleave',scheduleAutoplay);
    root.addEventListener('focusin',clearAutoplay);
    root.addEventListener('focusout',function(){setTimeout(scheduleAutoplay,0)});
    addEventListener('resize',function(){update();scheduleAutoplay()});
    document.addEventListener('visibilitychange',scheduleAutoplay);
    update();
    scheduleAutoplay();
  });

  document.querySelectorAll('[data-before-after]').forEach(function(root){
    var range=root.querySelector('.ba-range');
    if(!range)return;
    function updateComparison(){root.style.setProperty('--position',range.value+'%')}
    range.addEventListener('input',updateComparison);
    updateComparison();
  });
})();
