// ---------- filtering ----------
  const chips = document.querySelectorAll('.chip');
  const cards = document.querySelectorAll('.card');
  const sectionTitles = document.querySelectorAll('.section-title');
  const groups = document.querySelectorAll('[data-group]');
  const visibleCount = document.getElementById('visibleCount');
  // numbers stay as-is (English)

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const f = chip.dataset.filter;
      let shown = 0;
      cards.forEach(card => {
        const match = f === 'all' || card.dataset.cat === f;
        card.style.display = match ? '' : 'none';
        if (match) shown++;
      });
      sectionTitles.forEach(t => t.style.display = (f === 'all' || t.dataset.cat === f) ? '' : 'none');
      groups.forEach(g => g.style.display = (f === 'all' || g.dataset.group === f) ? '' : 'none');
      visibleCount.textContent = shown + ' animations';
    });
  });

  // ---------- copy code ----------
  const snippets = {
    'glow-btn': `.glow-btn{\n  background:#E8A33D;\n  border:none;\n  box-shadow:0 0 0 0 rgba(232,163,61,.6);\n  transition:box-shadow .35s ease, transform .2s ease;\n}\n.glow-btn:hover{\n  box-shadow:0 0 26px 4px rgba(232,163,61,.55);\n  transform:translateY(-2px);\n}`,
    'scale-card': `.scale-card{\n  transition:transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s ease;\n}\n.scale-card:hover{\n  transform:scale(1.08) translateY(-4px);\n  box-shadow:0 14px 30px -10px rgba(0,0,0,.6);\n}`,
    'u-link': `.u-link{ position:relative; }\n.u-link::after{\n  content:""; position:absolute; inset-inline-start:0; bottom:0;\n  height:2px; width:100%; background:currentColor;\n  transform:scaleX(0); transform-origin:right;\n  transition:transform .3s ease;\n}\n.u-link:hover::after{ transform:scaleX(1); }`,
    'morph': `.morph span{ transition:all .3s ease; }\n.morph:hover span:nth-child(1){ transform:translateY(9.5px) rotate(45deg); }\n.morph:hover span:nth-child(2){ opacity:0; }\n.morph:hover span:nth-child(3){ transform:translateY(-9.5px) rotate(-45deg); }`,
    'tilt-card': `.tilt-wrap{ perspective:600px; }\n.tilt-card{ transition:transform .35s ease; }\n.tilt-wrap:hover .tilt-card{\n  transform:rotateX(10deg) rotateY(-16deg) scale(1.04);\n}`,
    'glass-card': `.glass-card{\n  background:rgba(255,255,255,.08);\n  border:1px solid rgba(255,255,255,.25);\n  backdrop-filter:blur(8px);\n  transition:background .3s ease, transform .3s ease;\n}\n.glass-card:hover{\n  background:rgba(255,255,255,.16);\n  transform:translateY(-3px);\n}`,
    'flip-card': `.flip-outer{ perspective:800px; }\n.flip-inner{\n  position:relative; transition:transform .5s;\n  transform-style:preserve-3d;\n}\n.flip-outer:hover .flip-inner{ transform:rotateY(180deg); }\n.flip-face{ position:absolute; inset:0; backface-visibility:hidden; }\n.flip-back{ transform:rotateY(180deg); }`,
    'btn-shine': `.btn-shine{ position:relative; overflow:hidden; }\n.btn-shine::after{\n  content:""; position:absolute; top:0; bottom:0; width:40%;\n  background:linear-gradient(120deg, transparent, rgba(255,255,255,.35), transparent);\n  transform:translateX(-120%) skewX(-15deg);\n}\n@keyframes shine-sweep{ to{ transform:translateX(220%) skewX(-15deg); } }\n.btn-shine:hover::after{ animation:shine-sweep 1s ease forwards; }`,
    'spinner': `.spinner{\n  width:34px; height:34px; border-radius:50%;\n  border:3px solid #262B38; border-top-color:#E8A33D;\n  animation:spin .9s linear infinite;\n}\n@keyframes spin{ to{ transform:rotate(360deg); } }`,
    'dots': `.dots span{\n  width:9px; height:9px; border-radius:50%; background:#37C2B0;\n  animation:dot-pulse 1.2s ease-in-out infinite;\n}\n.dots span:nth-child(2){ animation-delay:.15s; }\n.dots span:nth-child(3){ animation-delay:.3s; }\n@keyframes dot-pulse{\n  0%,80%,100%{ transform:scale(.6); opacity:.4; }\n  40%{ transform:scale(1); opacity:1; }\n}`,
    'bar-track': `.bar-track{ overflow:hidden; background:#1F2430; border-radius:99px; }\n.bar-fill{\n  height:100%; width:35%; border-radius:99px;\n  background:#37C2B0;\n  animation:bar-sweep 1.4s ease-in-out infinite;\n}\n@keyframes bar-sweep{\n  0%{ transform:translateX(-100%); }\n  100%{ transform:translateX(220%); }\n}`,
    'ring-wrap': `.ring-wrap{ position:relative; width:20px; height:20px; }\n.ring-wrap .core,\n.ring-wrap .ring{ position:absolute; inset:0; border-radius:50%; background:#E8A33D; }\n.ring-wrap .ring{ animation:ping 1.6s cubic-bezier(0,.5,.5,1) infinite; }\n@keyframes ping{\n  0%{ transform:scale(.7); opacity:.9; }\n  100%{ transform:scale(2.1); opacity:0; }\n}`,
    'skeleton': `.sk-line{\n  height:10px; border-radius:5px;\n  background:linear-gradient(90deg,#1F2430 25%,#181C25 50%,#1F2430 75%);\n  background-size:250% 100%;\n  animation:shimmer 1.6s linear infinite;\n}\n@keyframes shimmer{\n  0%{ background-position:-150% 0; }\n  100%{ background-position:150% 0; }\n}`,
    'ring-svg': `.ring-fg{\n  fill:none; stroke:#E8A33D; stroke-width:6; stroke-linecap:round;\n  stroke-dasharray:157;\n  animation:ring-progress 2.4s ease-in-out infinite;\n}\n@keyframes ring-progress{\n  0%{ stroke-dashoffset:157; }\n  50%{ stroke-dashoffset:35; }\n  100%{ stroke-dashoffset:157; }\n}`,
    'check': `.check-circle{\n  stroke:#37C2B0; stroke-width:4; fill:none;\n  stroke-dasharray:151; stroke-dashoffset:151;\n  animation:draw 2.2s ease infinite;\n}\n.check-mark{\n  stroke:#37C2B0; stroke-width:5; fill:none;\n  stroke-linecap:round; stroke-linejoin:round;\n  stroke-dasharray:36; stroke-dashoffset:36;\n  animation:draw .5s .7s ease forwards infinite;\n  animation-duration:2.2s;\n}\n@keyframes draw{ to{ stroke-dashoffset:0; } }`,
    'bounce-el': `.bounce-el{ animation:bounce-in 1.8s ease-in-out infinite; }\n@keyframes bounce-in{\n  0%{ transform:translateY(0) scale(1); }\n  30%{ transform:translateY(-16px) scale(1.03); }\n  50%{ transform:translateY(0) scale(1); }\n  65%{ transform:translateY(-7px); }\n  80%,100%{ transform:translateY(0); }\n}`,
    'float-el': `.float-el{ animation:float 2.4s ease-in-out infinite; }\n@keyframes float{\n  0%,100%{ transform:translateY(0); }\n  50%{ transform:translateY(-9px); }\n}`,
    'shake-box': `.shake-box:hover{ animation:shake-x .5s ease; }\n@keyframes shake-x{\n  10%,90%{ transform:translateX(-1px); }\n  20%,80%{ transform:translateX(2px); }\n  30%,50%,70%{ transform:translateX(-4px); }\n  40%,60%{ transform:translateX(4px); }\n}`,
    'err-input': `.err-input{\n  border:1.5px solid #E2584B; color:#E2584B;\n  animation:shake-x 2.4s ease-in-out infinite;\n}`,
    'wave': `.wave span{\n  width:6px; height:100%; border-radius:4px; background:#E8A33D;\n  animation:wave-bar 1s ease-in-out infinite;\n}\n.wave span:nth-child(2){ animation-delay:.1s; }\n.wave span:nth-child(3){ animation-delay:.2s; }\n.wave span:nth-child(4){ animation-delay:.3s; }\n.wave span:nth-child(5){ animation-delay:.4s; }\n@keyframes wave-bar{\n  0%,100%{ transform:scaleY(.35); }\n  50%{ transform:scaleY(1); }\n}`,
    'cycle-el': `.cycle-el{\n  background:conic-gradient(#E8A33D,#37C2B0,#E8A33D);\n  animation:hue 3s linear infinite;\n}\n@keyframes hue{ to{ filter:hue-rotate(360deg); } }`,
    'grad-text': `.grad-text{\n  background:linear-gradient(90deg,#E8A33D,#37C2B0,#E8A33D);\n  background-size:200% auto;\n  -webkit-background-clip:text; background-clip:text; color:transparent;\n  animation:grad-move 3s ease infinite;\n}\n@keyframes grad-move{\n  0%,100%{ background-position:0% 50%; }\n  50%{ background-position:100% 50%; }\n}`,
    'type-line': `.caret{\n  display:inline-block; width:2px; height:14px; background:#37C2B0;\n  animation:caret .8s step-end infinite;\n}\n@keyframes caret{ 50%{ opacity:0; } }\n/* type/delete the text itself with a small JS loop */`,
    'neon-text': `.neon-text{ color:#fff; animation:neon-flicker 3.2s infinite; }\n@keyframes neon-flicker{\n  0%,19%,21%,23%,54%,56%,100%{\n    opacity:1;\n    text-shadow:0 0 6px #37C2B0, 0 0 18px #37C2B0, 0 0 34px #2A9587;\n  }\n  20%,22%,55%{ opacity:.35; text-shadow:none; }\n}`,
    'wave-text': `.wave-text span{ display:inline-block; animation:letter-bounce 1.4s ease-in-out infinite; }\n@keyframes letter-bounce{\n  0%,60%,100%{ transform:translateY(0); }\n  30%{ transform:translateY(-10px); }\n}\n/* set animation-delay = index * 0.08s per letter in JS */`,
    'ants': `.ants rect{\n  fill:none; stroke:#E8A33D; stroke-width:2;\n  stroke-dasharray:8 6;\n  animation:ants 1s linear infinite;\n}\n@keyframes ants{ to{ stroke-dashoffset:-24; } }`,
    'field': `.field label{\n  position:absolute; inset-inline-start:12px; top:14px;\n  transition:all .18s ease;\n}\n.field input:focus ~ label,\n.field input:not(:placeholder-shown) ~ label{\n  top:5px; font-size:10px; color:#37C2B0;\n}`,
    'mesh': `.mesh i{\n  position:absolute; width:90px; height:90px; border-radius:50%;\n  filter:blur(26px); opacity:.65;\n  animation:blob-move 5s ease-in-out infinite;\n}\n@keyframes blob-move{\n  0%,100%{ transform:translate(0,0) scale(1); }\n  33%{ transform:translate(14px,-10px) scale(1.1); }\n  66%{ transform:translate(-10px,8px) scale(.92); }\n}`,
    'aura-box': `.aura-box{ animation:aura-pulse 2.4s ease-in-out infinite; }\n@keyframes aura-pulse{\n  0%,100%{ box-shadow:0 0 0 0 rgba(232,163,61,.35), 0 0 40px 4px rgba(232,163,61,.18); }\n  50%{ box-shadow:0 0 0 10px rgba(232,163,61,0), 0 0 60px 14px rgba(232,163,61,.32); }\n}`,
    'noise': `.grain{\n  position:absolute; inset:-20%;\n  background-image:radial-gradient(rgba(255,255,255,.5) 1px, transparent 1px);\n  background-size:3px 3px; opacity:.18;\n  animation:noise-jump .5s steps(2) infinite;\n}\n@keyframes noise-jump{\n  10%{ transform:translate(-1%,-2%); } 30%{ transform:translate(2%,-1%); }\n  50%{ transform:translate(3%,0); } 70%{ transform:translate(1%,2%); } 90%{ transform:translate(2%,3%); }\n}`,
    'glow-border': `.glow-border-wrap{ position:relative; }\n.glow-border-wrap::before{\n  content:""; position:absolute; inset:-30%;\n  background:conic-gradient(from 0deg,#E8A33D,#37C2B0, transparent 40%, #E8A33D);\n  animation:border-rotate 2.4s linear infinite;\n}\n.glow-border-inner{ position:relative; z-index:1; background:#181C25; }\n@keyframes border-rotate{ to{ transform:rotate(360deg); } }`,
  };

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const code = snippets[btn.dataset.id] || '';
      try{
        await navigator.clipboard.writeText(code);
      }catch(e){
        const ta = document.createElement('textarea');
        ta.value = code; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      const original = btn.textContent;
      btn.textContent = 'Copied ✓';
      btn.classList.add('copied');
      setTimeout(()=>{ btn.textContent = original; btn.classList.remove('copied'); }, 1400);
    });
  });

  // ---------- typing effect ----------
  const phrases = ['border-radius: 16px;', 'transition: .3s ease;', 'transform: scale(1.05);'];
  const typeEl = document.querySelector('#typeTarget .txt');
  if (typeEl){
    let pi = 0, ci = 0, deleting = false;
    function tick(){
      const word = phrases[pi];
      if (!deleting){
        ci++;
        typeEl.textContent = word.slice(0, ci);
        if (ci === word.length){ deleting = true; setTimeout(tick, 1200); return; }
      } else {
        ci--;
        typeEl.textContent = word.slice(0, ci);
        if (ci === 0){ deleting = false; pi = (pi+1) % phrases.length; }
      }
      setTimeout(tick, deleting ? 45 : 75);
    }
    tick();
  }

  // ---------- wave text letters ----------
  const waveTarget = document.getElementById('waveTextTarget');
  if (waveTarget){
    'Wave Text'.split('').forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.animationDelay = (i * 0.08) + 's';
      waveTarget.appendChild(span);
    });
  }
