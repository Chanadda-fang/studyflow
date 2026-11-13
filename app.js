(() => {
  const STORE = 'studyflow-v2';
  const day = 86400000;
  const today = new Date(); today.setHours(0,0,0,0);
  const plusDays = n => {const d=new Date(today.getTime()+n*day);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const demoData = () => ({subjects:[],questions:[],sessions:[],mood:'',lastReplan:null,dailyMinutes:90});
  let data;
  try { data = JSON.parse(localStorage.getItem(STORE)) || demoData(); } catch { data = demoData(); }
  const save = () => localStorage.setItem(STORE, JSON.stringify(data));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const subjectBy = id => data.subjects.find(s => s.id === id);
  const topicBy = id => { for (const s of data.subjects) {const t=s.topics.find(x=>x.id===id);if(t)return {subject:s,topic:t};} return {}; };
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const daysUntil = date => Math.ceil((new Date(date+'T00:00:00')-today)/day);
  const niceDate = d => new Date(d+'T00:00:00').toLocaleDateString('en-US',{day:'numeric',month:'short'});
  const dateText = d => new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'long'});
  const confidenceLabel = v => ({low:'Needs review',mid:'Getting there',high:'Understood'}[v]||'Getting there');
  const toast = msg => { const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400); };
  function subjectsSorted(){return [...data.subjects].sort((a,b)=>a.date.localeCompare(b.date));}
  function getPlan(date){
    const all=[];
    data.subjects.forEach(s=>s.topics.forEach(t=>{if(!t.done)all.push({subject:s,topic:t,priority:(t.confidence==='low'?3:t.confidence==='mid'?2:1)*2+Math.max(0,7-daysUntil(s.date))/3});}));
    all.sort((a,b)=>b.priority-a.priority || a.subject.date.localeCompare(b.subject.date));
    const target = new Date(date+'T00:00:00'); const offset=Math.round((target-today)/day);
    const slots=Math.max(1,Math.min(4,Math.floor((data.dailyMinutes||90)/30)));
    return all.filter((x,i)=> (i % 5)===((offset%5+5)%5)).slice(0,slots).map(x=>({...x,minutes:x.topic.confidence==='low'?30:25}));
  }
  function render(){ renderHeader();renderHome();renderPlan();renderSubjects();renderQuestions(); }
  function renderHeader(){
    $('#todayLabel').textContent=new Date().toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'});
    $('#questionCount').textContent=data.questions.length;
    const n=subjectsSorted()[0];
    $('#starterPanel').classList.toggle('hidden',data.subjects.length>0);
    if(n){const left=daysUntil(n.date);$('#nextExamTitle').textContent=`${n.name} · ${niceDate(n.date)}`;$('#nextExamSub').textContent=left<0?'This exam has passed. Ready to add another?':`${left} days to go. Give the trickiest topics a little extra room.`;$('#daysLeft').textContent=Math.max(0,left);$('#countdownProgress').style.width=`${Math.min(100,Math.max(15,100-left*9))}%`;}
    else {$('#nextExamTitle').textContent='Your next exam starts here';$('#nextExamSub').textContent='Add a subject, exam date, and the topics on your mind.';$('#daysLeft').textContent='—';}
    const todaySessions=data.sessions.filter(x=>new Date(x.at).toDateString()===new Date().toDateString());const mins=todaySessions.reduce((a,x)=>a+x.minutes,0);$('#todayFocus').textContent=`${mins} min`;
    $('#focusCount').textContent=`✦ ${todaySessions.length} ${todaySessions.length===1?'session':'sessions'} today`;
  }
  function renderHome(){
    const entries=getPlan(plusDays(0)); const box=$('#todayTasks');
    if(!entries.length) box.innerHTML=`<div class="empty-today">${data.subjects.length?'You’re all caught up for today. Rest easy ✿':'Add a subject and your topics will show up here.'}</div>`;
    else box.innerHTML=entries.map(({subject,topic,minutes})=>`<div class="task-row"><input class="task-check" type="checkbox" data-done="${topic.id}" ${topic.done?'checked':''}><div class="task-info"><div class="task-title">${escapeHtml(topic.name)}</div><div class="task-meta"><span class="subject-pill">${escapeHtml(subject.name)}</span><span>·</span><span>${confidenceLabel(topic.confidence)}</span></div></div><span class="task-duration">${minutes} min</span><button class="task-start" data-start="${topic.id}">Focus on this</button></div>`).join('');
    box.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>selectTask(b.dataset.start));box.querySelectorAll('[data-done]').forEach(b=>b.onchange=()=>markDone(b.dataset.done,b.checked));
    const list=$('#subjectProgress');
    list.innerHTML=subjectsSorted().map(s=>{const done=s.topics.filter(t=>t.done).length,pct=s.topics.length?Math.round(done/s.topics.length*100):0;return `<div class="progress-item"><span class="subject-icon ${s.color}">${s.color==='mint'?'✿':s.color==='peach'?'☼':s.color==='blue'?'✦':'◌'}</span><div><div class="progress-name">${escapeHtml(s.name)}</div><div class="progress-small">Exam ${niceDate(s.date)} · ${done}/${s.topics.length} topics</div><div class="progress-track"><i style="width:${pct}%"></i></div></div><span class="progress-percent">${pct}%</span></div>`}).join('')||'<div class="empty-today">Add a subject to get started ✦</div>';
  }
  function renderPlan(){
    const strip=$('#weekStrip');let selected=window.planSelected||plusDays(0);window.planSelected=selected;
    strip.innerHTML=Array.from({length:7},(_,i)=>{const date=plusDays(i),d=new Date(date+'T00:00:00');return `<button class="day-chip ${date===selected?'selected':''}" data-date="${date}"><small>${d.toLocaleDateString('en-US',{weekday:'short'})}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('en-US',{month:'short'})}</small></button>`}).join('');
    strip.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{window.planSelected=b.dataset.date;renderPlan();});
    const entries=getPlan(selected);$('#planTodayCount').textContent=entries.length;$('#planStudyTime').textContent=`${entries.reduce((a,x)=>a+x.minutes,0)} min`;
    $('#dayPlan').innerHTML=entries.length?`<div class="plan-day-heading">${dateText(selected)} <span style="font-weight:400;color:#aaa">· ${entries.length} tasks</span></div>`+entries.map(({subject,topic,minutes},i)=>`<div class="plan-card ${topic.done?'done':''}"><span class="plan-time">${['09:00','10:00','13:30','15:00'][i%4]}</span><span class="plan-color" style="background:${subject.color==='peach'?'#e6ad88':subject.color==='mint'?'#8fc2a0':subject.color==='blue'?'#84add7':'#a79add'}"></span><div class="plan-card-content"><b>${escapeHtml(topic.name)}</b><small>${escapeHtml(subject.name)} · ${confidenceLabel(topic.confidence)} · ${minutes} min</small></div><input class="task-check" type="checkbox" data-done="${topic.id}" ${topic.done?'checked':''}></div>`).join(''):`<div class="plan-empty">${data.subjects.length?'Nothing scheduled for this day ☁':'Add a subject and topics to start your study plan.'}<br><br>${data.subjects.length?'<button class="text-button" data-replan>Re-plan unfinished topics →</button>':'<button class="text-button" data-add-subject>＋ Add your first subject</button>'}</div>`;
    $('#dayPlan').querySelectorAll('[data-done]').forEach(b=>b.onchange=()=>markDone(b.dataset.done,b.checked));$('#dayPlan').querySelector('[data-replan]')?.addEventListener('click',replan);$('#dayPlan').querySelector('[data-add-subject]')?.addEventListener('click',()=>dialog.showModal());
  }
  function renderSubjects(){
    const list=$('#subjectsList');$('#subjectsEmpty').classList.toggle('hidden',data.subjects.length>0);list.classList.toggle('hidden',!data.subjects.length);
    list.innerHTML=subjectsSorted().map(s=>{const pct=s.topics.length?Math.round(s.topics.filter(t=>t.done).length/s.topics.length*100):0;return `<article class="subject-card"><div class="subject-card-head"><span class="subject-big-icon subject-icon ${s.color}">${s.color==='mint'?'✿':s.color==='peach'?'☼':s.color==='blue'?'✦':'◌'}</span><div class="subject-title"><h3>${escapeHtml(s.name)}</h3><p>Exam ${dateText(s.date)} · ${Math.max(0,daysUntil(s.date))} days left</p></div><button class="delete-subject" data-delete-subject="${s.id}" aria-label="Delete subject">×</button></div><div class="subject-overview"><span>${s.topics.filter(t=>t.done).length}/${s.topics.length} topics done</span><div class="progress-track"><i style="width:${pct}%"></i></div><span>${pct}%</span></div><div class="topic-list">${s.topics.map(t=>`<div class="topic-row"><input class="task-check" type="checkbox" data-done="${t.id}" ${t.done?'checked':''}><span class="topic-name">${escapeHtml(t.name)}${t.minutes?` <span style="color:#aaa;font-size:8px">· ${t.minutes} min studied</span>`:''}</span><span class="confidence-tag ${t.confidence}">${confidenceLabel(t.confidence)}</span><select class="confidence-select" data-confidence="${t.id}" aria-label="Update confidence"><option value="low" ${t.confidence==='low'?'selected':''}>Needs review</option><option value="mid" ${t.confidence==='mid'?'selected':''}>Getting there</option><option value="high" ${t.confidence==='high'?'selected':''}>Understood</option></select></div>`).join('')}</div><button class="add-topic-inline" data-add-topic="${s.id}">＋ Add another topic</button></article>`}).join('');
    list.querySelectorAll('[data-done]').forEach(b=>b.onchange=()=>markDone(b.dataset.done,b.checked));list.querySelectorAll('[data-confidence]').forEach(b=>b.onchange=()=>{const {topic}=topicBy(b.dataset.confidence);topic.confidence=b.value;save();render();});list.querySelectorAll('[data-delete-subject]').forEach(b=>b.onclick=()=>{if(confirm('Delete this subject and all its topics?')){data.subjects=data.subjects.filter(s=>s.id!==b.dataset.deleteSubject);save();render();toast('Subject deleted.');}});list.querySelectorAll('[data-add-topic]').forEach(b=>b.onclick=()=>{const name=prompt('Name your new topic');if(name?.trim()){subjectBy(b.dataset.addTopic).topics.push({id:crypto.randomUUID(),name:name.trim(),confidence:'low',done:false,minutes:0});save();render();}});
  }
  function renderQuestions(){
    $('#questionSubject').innerHTML='<option value="">Choose a subject (optional)</option>'+subjectsSorted().map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
    const list=$('#questionsList');list.innerHTML=data.questions.length?data.questions.map(q=>`<div class="question-row"><span class="question-spark" style="width:28px;height:28px;font-size:15px">✎</span><p>${escapeHtml(q.text)}</p>${subjectBy(q.subjectId)?`<small>${escapeHtml(subjectBy(q.subjectId).name)}</small>`:''}<button data-delete-question="${q.id}" aria-label="Mark question resolved">✓</button></div>`).join(''):'<div class="no-questions">Your question stash is empty. Save a question here whenever you hit a snag.</div>';
    list.querySelectorAll('[data-delete-question]').forEach(b=>b.onclick=()=>{data.questions=data.questions.filter(q=>q.id!==b.dataset.deleteQuestion);save();render();toast('Question cleared from your stash.');});
  }
  function markDone(id,value){const {topic}=topicBy(id);if(!topic)return;topic.done=value;if(value&&topic.confidence==='low')topic.confidence='mid';save();render();toast(value?'Topic complete. Look at you ✦':'Topic added back to your plan.');}
  function selectTask(id){const {subject,topic}=topicBy(id);if(!topic)return;$('#timerTaskName').textContent=topic.name;window.activeTopic=id;toast(`Ready when you are: ${topic.name}`);}
  function replan(){
    data.lastReplan=Date.now();save();window.planSelected=plusDays(0);render();const first=getPlan(plusDays(0))[0];if(first)selectTask(first.topic.id);toast('Your plan has a fresh start. Try the highest-priority topic ✦');
  }
  // Timer
  let duration=0,remaining=0,tick=null,active=false,sessionMinutes=0;
  const display=()=>{const m=Math.floor(remaining/60),s=remaining%60;$('#timerDisplay').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;const progress=duration?((duration-remaining)/duration)*360:0;$('#timerRing').style.background=`conic-gradient(#4b9fd0 ${progress}deg,#e5f2fb ${progress}deg)`;$('#timerStart').disabled=duration===0;};
  const pepTalks=['One page is a real start.','Tiny steps still move you forward.','You do not have to finish everything today.','Future you says thanks for showing up.','Breathe in. Pick one thing. Begin.'];let pepIndex=0;
  $('#timerMascot').onclick=()=>{pepIndex=(pepIndex+1)%pepTalks.length;$('#buddyTip').textContent=pepTalks[pepIndex];$('#timerMascot').classList.remove('buddy-bounce');void $('#timerMascot').offsetWidth;$('#timerMascot').classList.add('buddy-bounce');};
  $('#focusMinutes').addEventListener('input',()=>{if(active)return;const value=Math.max(0,Math.min(240,Number($('#focusMinutes').value)||0));sessionMinutes=value;duration=value*60;remaining=duration;$('#timerModeLabel').textContent=value?'custom focus':'set your own focus time';display();});
  $('#timerStart').onclick=()=>{if(active){clearInterval(tick);active=false;$('#timerStart').innerHTML='Resume focus <span>▶</span>';$('#timerMascot').classList.remove('is-focused');return;}if(!sessionMinutes){toast('Choose your focus time first.');return;}if(remaining<=0){remaining=duration;display();}active=true;$('#timerStart').innerHTML='Pause <span>Ⅱ</span>';$('#timerMascot').classList.add('is-focused');tick=setInterval(()=>{remaining--;display();if(remaining<=0){clearInterval(tick);active=false;$('#timerStart').innerHTML='Start focus <span>▶</span>';$('#timerMascot').classList.remove('is-focused');$('#sessionSummary').textContent=`You focused for ${sessionMinutes} minutes${window.activeTopic?` on “${topicBy(window.activeTopic).topic?.name||''}”`:''}.`;$('#sessionDialog').showModal();}},1000);};
  $('#timerReset').onclick=()=>{clearInterval(tick);active=false;remaining=duration;display();$('#timerStart').innerHTML='Start focus <span>▶</span>';$('#timerMascot').classList.remove('is-focused');};
  $('#sessionForm').addEventListener('submit',e=>{e.preventDefault();const conf=$('input[name="confidence"]:checked')?.value||'mid';const note=$('#sessionNote').value.trim();if(window.activeTopic){const {topic}=topicBy(window.activeTopic);if(topic){topic.confidence=conf;if(conf==='high')topic.done=true;topic.minutes=(topic.minutes||0)+sessionMinutes;}}data.sessions.push({at:Date.now(),minutes:sessionMinutes,topicId:window.activeTopic||null,note});if(note&&window.activeTopic){const {subject,topic}=topicBy(window.activeTopic);data.questions.push({id:crypto.randomUUID(),text:note,subjectId:subject?.id||'',created:Date.now()});}save();$('#sessionDialog').close();$('#sessionNote').value='';$('#focusMinutes').value='';sessionMinutes=0;duration=0;remaining=0;display();render();toast('Progress saved. Take a little eye break now ☁');});
  // navigation and actions
  const viewNames={home:'Today',plan:'Study plan',subjects:'Subjects & topics',questions:'Question stash'};
  function go(view){$$('.view').forEach(v=>v.classList.remove('active-view'));$(`#${view}View`).classList.add('active-view');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#crumb').textContent=viewNames[view];window.scrollTo({top:0,behavior:'smooth'});}
  $$('.nav-item').forEach(b=>b.onclick=()=>go(b.dataset.view));$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
  $('#replanBtn').onclick=replan;
  const dialog=$('#subjectDialog');$('#addSubjectBtn').onclick=()=>dialog.showModal();$$('[data-add-subject]').forEach(b=>b.onclick=()=>dialog.showModal());
  $('#subjectForm').addEventListener('submit',e=>{e.preventDefault();const name=$('#subjectName').value.trim(),date=$('#subjectDate').value,color=$('#subjectColor').value,topics=$('#subjectTopics').value.split('\n').map(x=>x.trim()).filter(Boolean);if(!name||!date)return;data.dailyMinutes=Number($('#dailyMinutes').value)||90;data.subjects.push({id:crypto.randomUUID(),name,date,color,topics:topics.map(name=>({id:crypto.randomUUID(),name,confidence:'low',done:false,minutes:0}))});save();dialog.close();e.target.reset();render();go('subjects');toast('Subject added. Let’s take it one step at a time ✦');});
  $('#questionForm').addEventListener('submit',e=>{e.preventDefault();data.questions.unshift({id:crypto.randomUUID(),text:$('#questionInput').value.trim(),subjectId:$('#questionSubject').value,created:Date.now()});save();e.target.reset();renderQuestions();$('#questionCount').textContent=data.questions.length;toast('Saved. Keep your reading flow going.');});
  $$('[data-mood]').forEach(b=>b.onclick=()=>{data.mood=b.dataset.mood;save();$$('[data-mood]').forEach(x=>x.classList.toggle('chosen',x===b));const tips={foggy:'Try a five-minute warm-up or revisit a familiar topic.',okay:'Pick one short task, then decide if you want to keep going.',ready:'Try a practice problem or tackle your trickiest topic.'};$('#moodFeedback').textContent=tips[b.dataset.mood];});
  $('#themeToggle').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('studyflow-dark',document.body.classList.contains('dark')?'1':'0');};if(localStorage.getItem('studyflow-dark')==='1')document.body.classList.add('dark');
  $('#heroAddSubject').onclick=()=>dialog.showModal();
  $('#resetDemo').onclick=()=>{if(confirm('Clear all subjects, plans, and notes saved in this browser?')){localStorage.removeItem(STORE);data=demoData();save();render();go('home');toast('Your space is clear. Start fresh whenever you like.');}};
  render();display();
})();
