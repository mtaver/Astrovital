'use strict';
const $ = id => document.getElementById(id);
const form = $('form');
const fields = ['sys','dia','pulse','baseline','glucose','temp','sleep','usualSleep'];
const prefix = 'astrovital-v1:';
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(prefix + key, JSON.stringify(value)); return true; }
  catch { return false; }
}
let logs = read('logs', []);
let attachment = read('archive', null);
let briefing = read('brief', '');
function assess(d) {
  if (d.red.length) return {
    level:'urgent', title:'Activate the onboard emergency protocol',
    reasons:d.red, action:'Alert the crew medical officer immediately. Follow the mission emergency checklist and contact ground medical support when possible.'
  };
  const reasons = [];
  if (d.sys > 180 || d.dia > 120) return {
    level:'urgent', title:'Immediate crew medical review',
    reasons:['Very high blood pressure (' + [d.sys ?? '—', d.dia ?? '—'].join('/') + ' mmHg).'],
    action:'Notify the crew medical officer immediately. In this scenario, repeat the reading after at least one minute if the crew protocol calls for it.'
  };
  if (d.glucose !== null && d.glucose < 70) return {
    level:'urgent', title:'Follow the onboard low-glucose protocol',
    reasons:['Blood glucose is below 70 mg/dL.'],
    action:'Notify the crew medical officer promptly and follow the mission’s hypoglycemia checklist.'
  };
  if (d.pulse !== null && d.baseline !== null && Math.abs(d.pulse - d.baseline) >= 15)
    reasons.push('Resting pulse differs from the usual value by ' + Math.abs(d.pulse - d.baseline) + ' bpm.');
  if (d.sleep !== null && d.sleep < 7) reasons.push('Sleep was below seven hours in the past 24 hours.');
  if (d.sleep !== null && d.usualSleep !== null && d.usualSleep - d.sleep >= 1.5)
    reasons.push('Sleep was ' + (d.usualSleep - d.sleep).toFixed(1) + ' hours below the personal baseline.');
  if (d.mood === 'Low' || d.mood === 'Very low') reasons.push('You reported ' + d.mood.toLowerCase() + ' mood.');
  if (d.temp !== null && (d.temp >= 38 || d.temp < 35)) reasons.push('Temperature triggered a prototype review flag. Check the device and measurement method.');
  if (d.notes) reasons.push('Review the symptoms or actions recorded in your note.');
  return reasons.length ? {
    level:'review', title:'Recheck and review', reasons,
    action:'Repeat unexpected measurements under consistent conditions. Discuss persistent changes or symptoms with the crew medical officer. Personal-baseline flags use prototype thresholds.'
  } : {
    level:'logged', title:'Check-in recorded', reasons:[],
    action:'The entered values triggered no programmed flag. Continue routine checks and report any concerning symptoms through your mission protocol.'
  };
}
function tab(id) {
  document.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === id;
    button.setAttribute('aria-pressed', String(active));
    $(button.dataset.tab).hidden = !active;
  });
  if (id === 'replay') draw();
}
document.querySelectorAll('[data-tab]').forEach(button => button.onclick = () => tab(button.dataset.tab));
function element(name, content) {
  const node = document.createElement(name);
  node.textContent = content;
  return node;
}
function showOutcome(result) {
  const outcome = $('outcome');
  const list = element('ul','');
  result.reasons.forEach(reason => list.append(element('li', reason)));
  outcome.replaceChildren(element('h2',result.title), list, element('p',result.action));
  list.hidden = !result.reasons.length;
  outcome.dataset.level = result.level;
  outcome.hidden = false;
}
function scenario(emergency) {
  form.reset();
  $('outcome').hidden = true;
  const data = emergency ? {sys:118,dia:76,pulse:72,baseline:70,sleep:7.5,usualSleep:7.8} :
    {sys:121,dia:77,pulse:86,baseline:68,sleep:5.1,usualSleep:7.8,mood:'Low',notes:'Unusually fatigued today'};
  Object.entries(data).forEach(([key,value]) => { form.elements[key].value = value; });
  form.querySelector('[name=red]').checked = emergency;
  if ($('recheck')) $('recheck').hidden = true;
  if (emergency) previewUrgent();
  $('formStatus').textContent = 'Scenario loaded. Select Assess and log to save it.';
}
$('fatigue').onclick = () => scenario(false);
$('emergency').onclick = () => scenario(true);
$('clear').onclick = () => { form.reset(); $('outcome').hidden = true; $('formStatus').textContent = ''; };
function previewUrgent() {
  const red = new FormData(form).getAll('red');
  if (red.length) {
    if ($('recheck')) $('recheck').hidden = true;
    showOutcome(assess({red}));
  }
  else $('outcome').hidden = true;
}
form.querySelectorAll('[name=red]').forEach(control => control.onchange = previewUrgent);
form.onsubmit = event => {
  event.preventDefault();
  const values = new FormData(form);
  const d = Object.fromEntries(fields.map(key => [key,values.get(key) === '' ? null : Number(values.get(key))]));
  ['mood','timing','method','notes'].forEach(key => { d[key] = values.get(key).trim(); });
  d.red = values.getAll('red');
  d.timestamp = new Date().toISOString();
  if (!d.red.length && ((d.sys === null) !== (d.dia === null) || (d.sys !== null && d.sys <= d.dia))) {
    $('formStatus').textContent = 'Enter both blood pressure values, with systolic higher than diastolic, or clear both.';
    return;
  }
  if (!d.red.length && !d.notes && !d.mood && ['sys','pulse','glucose','temp','sleep'].every(key => d[key] === null)) {
    $('formStatus').textContent = 'Enter at least one measurement, mood, or symptom.';
    return;
  }
  d.assessment = assess(d);
  logs = [d,...logs].slice(0,30);
  $('formStatus').textContent = save('logs',logs) ? 'Check-in saved on this device.' : 'Check-in available in this session. Browser storage is unavailable.';
  showOutcome(d.assessment);
  renderHistory();
  renderRecheck();
  $('outcome').scrollIntoView({block:'nearest'});
};
function renderHistory() {
  const latest = logs[0];
  $('trend').textContent = latest ? 'Latest ' + latest.assessment.title.toLowerCase() + '. Each entry is a separate check.' : 'Your saved checks will appear here.';
  $('history').replaceChildren(...logs.slice(0,8).map(d => element('li',
    d.timestamp.slice(0,16).replace('T',' ') + ' UTC · ' +
    (d.pulse === null ? 'Pulse missing' : d.pulse + ' bpm') + ' · ' +
    (d.sleep === null ? 'Sleep missing' : d.sleep + ' h sleep'))));
}
renderHistory();
const recheckForm = $('recheckForm');
function renderRecheck() {
  if (!recheckForm) return;
  const d = logs[0];
  const eligible = d && d.pulse !== null && d.baseline !== null && d.assessment.level !== 'urgent' && !d.recheckEmergency;
  $('recheck').hidden = !eligible;
  recheckForm.reset();
  recheckForm.hidden = true;
  if (!eligible) return;
  $('pulseComparison').textContent = d.baseline + ' usual → ' + d.pulse + ' first' +
    (d.repeat ? ' → ' + d.repeat.pulse + ' repeat' : '') + ' bpm';
  $('recheckResult').textContent = d.repeat ? d.repeat.result : 'Compare a second resting pulse with your first reading and baseline.';
  $('startRecheck').hidden = Boolean(d.repeat);
}
if (recheckForm) {
  $('startRecheck').onclick = () => {
    recheckForm.hidden = false;
    recheckForm.elements.repeat.focus();
  };
  $('cancelRecheck').onclick = () => {
    recheckForm.reset();
    recheckForm.hidden = true;
    $('startRecheck').focus();
  };
  recheckForm.elements.urgent.onchange = event => {
    if (!event.target.checked) return;
    const d = logs[0];
    d.recheckEmergency = {
      timestamp: new Date().toISOString(),
      assessment: assess({red:['Emergency symptom reported during pulse recheck.']})
    };
    const stored = save('logs',logs);
    renderRecheck();
    showOutcome(d.recheckEmergency.assessment);
    $('formStatus').textContent = stored ? 'Emergency symptom saved on this device.' : 'Emergency symptom recorded in this session.';
    $('outcome').scrollIntoView({block:'nearest'});
  };
  recheckForm.onsubmit = event => {
    event.preventDefault();
    const d = logs[0];
    const pulse = recheckForm.elements.repeat.valueAsNumber;
    const delta = Math.abs(pulse - d.baseline);
    const result = delta >= 15 ?
      'Repeat pulse still triggers the prototype baseline flag. Review it with the crew medical officer.' :
      'Repeat pulse is below the prototype baseline flag threshold. Review any persistent symptoms with the crew medical officer.';
    d.repeat = {pulse,timestamp:new Date().toISOString(),conditions:recheckForm.elements.conditions.value.trim(),result};
    const stored = save('logs',logs);
    renderRecheck();
    $('recheckResult').textContent += stored ? ' Repeat saved on this device.' : ' Repeat is available in this session.';
  };
}
renderRecheck();
const records = $('archive').textContent.trim().split(/\r?\n/).slice(1).map(line => {
  const [timestamp,instrument,rate] = line.replaceAll('"','').split(',');
  return {timestamp,instrument,rate:Number(rate)};
}).filter(row => Number.isFinite(row.rate) && row.timestamp && row.instrument);
const seek = $('seek');
let readingA = null;
function describeReading(row) {
  return row.timestamp.replace('T',' ') + ' UTC · ' + row.instrument + ' · ' + row.rate.toFixed(2) + ' μGy/h';
}
function difference(a,b) {
  const change = b.rate - a.rate;
  return (change > 0 ? '+' : '') + change.toFixed(2) + ' μGy/h';
}
function updateComparison() {
  if (!readingA) return;
  const b = records[Number(seek.value)];
  $('archiveComparison').textContent = 'A · ' + describeReading(readingA) + ' | B · ' + describeReading(b) +
    ' | B minus A: ' + difference(readingA,b);
  $('attachPair').disabled = readingA === b;
}
if ($('pinReading')) {
  $('pinReading').onclick = () => {
    readingA = records[Number(seek.value)];
    updateComparison();
  };
  $('attachPair').onclick = () => {
    attachment = {a:readingA,b:records[Number(seek.value)]};
    $('replayStatus').textContent = save('archive',attachment) ? 'Archive comparison saved for your next briefing.' : 'Archive comparison attached for this session.';
  };
}
seek.max = records.length - 1;
const chart = $('chart');
const ctx = chart.getContext('2d');
const start = Date.parse(records[0].timestamp + 'Z');
const span = Date.parse(records.at(-1).timestamp + 'Z') - start;
const ceiling = Math.ceil(Math.max(...records.map(row => row.rate))/5)*5;
const x = row => 54 + 698 * (Date.parse(row.timestamp + 'Z') - start) / span;
const y = rate => 244 - 218 * rate / ceiling;
function draw() {
  const selected = records[Number(seek.value)];
  $('dose').textContent = selected.rate.toFixed(2) + ' μGy/h';
  $('when').textContent = selected.timestamp.replace('T',' ') + ' UTC · ' + selected.instrument;
  seek.setAttribute('aria-valuetext', $('when').textContent + ' · ' + $('dose').textContent);
  updateComparison();
  if (!ctx) return;
  ctx.clearRect(0,0,780,290);
  ctx.font = '15px system-ui';
  for (let step=0; step<=4; step++) {
    const value = ceiling * step/4;
    ctx.fillStyle='#a6b7c7';
    ctx.fillText(String(Math.round(value)),12,y(value)+5);
    ctx.strokeStyle='#263747';
    ctx.beginPath();ctx.moveTo(54,y(value));ctx.lineTo(752,y(value));ctx.stroke();
  }
  ctx.fillText('01 Apr · 23:00 UTC',54,273);
  ctx.textAlign='right';
  ctx.fillText('02 Apr · 01:05 UTC',752,273);
  ctx.textAlign='left';
  ctx.beginPath();
  records.forEach((row,index) => index ? ctx.lineTo(x(row),y(row.rate)) : ctx.moveTo(x(row),y(row.rate)));
  ctx.strokeStyle='#74f3d3';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(x(selected),y(selected.rate),5,0,2*Math.PI);ctx.fillStyle='#f0f6f9';ctx.fill();
}
seek.oninput = draw;
chart.onclick = event => {
  const rect = chart.getBoundingClientRect();
  const target = (event.clientX - rect.left) * 780 / rect.width;
  seek.value = records.reduce((best,row,i) => Math.abs(x(row)-target) < Math.abs(x(records[best])-target) ? i : best,0);
  draw();
};
$('attach').onclick = () => {
  attachment = records[Number(seek.value)];
  $('replayStatus').textContent = save('archive',attachment) ? 'Archive reading saved for your next briefing.' : 'Archive reading attached for this session.';
};
function showBrief() {
  $('briefText').hidden = !briefing;
  $('briefText').textContent = briefing;
  $('download').disabled = !briefing;
}
showBrief();
$('generate').onclick = () => {
  const d = logs[0];
  if (!d && !attachment) {
    $('briefStatus').textContent = 'Log a check-in or attach a NASA reading first.';
    return;
  }
  const format = (value,unit) => value === null ? 'Not recorded' : value + ' ' + unit;
  const lines = ['ASTROVITAL CREW MEDICAL BRIEFING','Training exercise',new Date().toISOString(),
    $('delay').checked ? 'Simulated communications outage · Awaiting handoff' : 'Ready for manual handoff',''];
  if (d) lines.push('CREW CHECK-IN · Training data',d.timestamp,'Status: '+d.assessment.title,
    'Blood pressure: '+(d.sys === null || d.dia === null ? 'Not recorded' : d.sys + '/' + d.dia + ' mmHg'),
    'Resting pulse: '+format(d.pulse,'bpm')+' · Usual: '+format(d.baseline,'bpm'),
    'Glucose: '+format(d.glucose,'mg/dL')+' · '+d.timing,
    'Temperature: '+format(d.temp,'°C')+' · '+d.method,
    'Sleep: '+format(d.sleep,'h')+' · Usual: '+format(d.usualSleep,'h'),
    'Mood: '+(d.mood || 'Not recorded'),'Crew note: '+(d.notes || 'None recorded'),
    ...d.assessment.reasons.map(reason => '• '+reason),'Crew action: '+d.assessment.action,'');
  if (d?.repeat) lines.push('PULSE RECHECK',d.repeat.timestamp,
    'Usual → First → Repeat: '+d.baseline+' → '+d.pulse+' → '+d.repeat.pulse+' bpm',
    'Measurement conditions: '+(d.repeat.conditions || 'Unspecified'),d.repeat.result,'');
  if (d?.recheckEmergency) lines.push('EMERGENCY DURING RECHECK',d.recheckEmergency.timestamp,
    d.recheckEmergency.assessment.title,d.recheckEmergency.assessment.action,'');
  if (attachment) lines.push('NASA OSDR RADLAB · Historical ISS context',
    ...(attachment.a ? [
      'Reading A: '+describeReading(attachment.a),'Reading B: '+describeReading(attachment.b),
      'Difference (B minus A): '+difference(attachment.a,attachment.b)
    ] : [attachment.timestamp+' UTC · '+attachment.instrument,'Absorbed dose rate: '+attachment.rate+' μGy/h']),
    'Instrument reading from a different mission. Personal exposure requires personal dosimetry.',
    'Source: https://visualization.osdr.nasa.gov/radlab/gui/data-api/');
  briefing = lines.join('\n');
  const stored = save('brief',briefing);
  $('briefStatus').textContent = stored ? 'Briefing saved on this device.' : 'Briefing available for download in this session.';
  showBrief();
};
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([briefing],{type:'text/plain;charset=utf-8'}));
  const link = element('a','');
  link.href = url;
  link.download = 'astrovital-briefing.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
};
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
