import { TEMPLES, DAYS, FARES } from './data/itinerary.js';
import { DAYLIGHT } from './data/daylight.js';
import { renderDayCard } from './components/day-card.js';
import { renderDaylightCycle } from './components/daylight-cycle.js';
const SCHEDULE = new Map(DAYS.flatMap(day => day.templeNums.map(num => [num, day.day])));
const CLOSED_DAYS = { 19: ['Thu 12 Nov'] };
const RECHECK = {
  15: 'RECHECK · phone ahead before travelling',
  31: 'RECHECK · landslide damage / partial reopening'
};
for (const temple of TEMPLES) {
  const scheduledDay = SCHEDULE.get(temple.num);
  if (!scheduledDay) throw new Error('Temple #' + temple.num + ' is not scheduled');
  if (temple.day !== scheduledDay) throw new Error('Temple #' + temple.num + ' has conflicting dates');
  if ((CLOSED_DAYS[temple.num] || []).includes(scheduledDay)) throw new Error('Temple #' + temple.num + ' is scheduled on a closure day');
}
TEMPLES.find(temple => temple.num === 19).notes = 'Rescheduled to Tue 10 Nov because Ōya-ji is closed Thursdays';
TEMPLES.find(temple => temple.num === 20).notes = 'Follows #19; #19 is closed Thursdays';
const KEY = 'bando33-jiku-v5';
const OLD_KEYS = ['bando33-jiku-v4','bando33-jiku-v3','bando33-jiku-v2','bando33-jiku-v1'];
const DAY_PLAN_KEY = 'bando33-day-plans-v1';
let state = JSON.parse(localStorage.getItem(KEY) || 'null');
if (!state) {
  for (const k of OLD_KEYS) {
    const old = localStorage.getItem(k);
    if (old) { state = JSON.parse(old); localStorage.setItem(KEY, old); break; }
  }
}
state = state || {};
let dayPlans = JSON.parse(localStorage.getItem(DAY_PLAN_KEY) || '{}') || {};
let filter = 'all';
let activeWeek = 'all';
let masonryObserver;
let masonryFrame;

function layoutMasonry() {
  masonryFrame = 0;
  const list = document.getElementById('list');
  const days = [...list.querySelectorAll(':scope > .day')];
  if (!window.matchMedia('(min-width: 900px)').matches) {
    days.forEach(day => { day.style.gridRowEnd = ''; });
    return;
  }
  const styles = getComputedStyle(list);
  const rowHeight = parseFloat(styles.gridAutoRows) || 8;
  const gap = parseFloat(styles.rowGap) || 12;
  days.forEach(day => { day.style.gridRowEnd = 'auto'; });
  days.forEach(day => {
    const span = Math.ceil((day.getBoundingClientRect().height + gap) / (rowHeight + gap));
    day.style.gridRowEnd = `span ${span}`;
  });
}

function queueMasonry() {
  if (masonryFrame) cancelAnimationFrame(masonryFrame);
  masonryFrame = requestAnimationFrame(layoutMasonry);
}

function observeMasonry() {
  masonryObserver?.disconnect();
  masonryObserver = new ResizeObserver(queueMasonry);
  document.querySelectorAll('#list > .day').forEach(day => masonryObserver.observe(day));
  queueMasonry();
}

window.addEventListener('resize',queueMasonry);

function weekKey(iso) {
  const date = new Date(iso + 'T12:00:00');
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function fillWeekNav() {
  const nav = document.getElementById('weekNav');
  const weeks = [...new Map(DAYS.map(day => [weekKey(day.iso), day])).entries()];
  nav.innerHTML = '';
  const options = [['all', 'All weeks'], ...weeks.map(([key, day]) => [key, 'Week of ' + new Date(key + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })])];
  for (const [key, label] of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = key === activeWeek ? 'active' : '';
    button.addEventListener('click', () => {
      activeWeek = key;
      fillWeekNav();
      render();
      document.getElementById('list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(button);
  }
}

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

function saveDayPlans() {
  localStorage.setItem(DAY_PLAN_KEY, JSON.stringify(dayPlans));
  window.BANDO33.dayPlans = dayPlans;
}

function workingDay(baseDay) {
  const custom = dayPlans[baseDay.iso];
  return custom ? { ...baseDay, ...custom, customised: true } : { ...baseDay, customised: false };
}

function routeMapUrl(day) {
  if (!day.customised) return day.mapUrl;
  const stops = day.templeNums
    .map(num => TEMPLES.find(temple => temple.num === num))
    .filter(Boolean)
    .map(temple => `${temple.jp} ${temple.romaji}, ${temple.city}`);
  return 'https://www.google.com/maps/dir/' + [day.origin, ...stops].map(value => encodeURIComponent(value)).join('/');
}

function fillDayPlanForm(day) {
  document.getElementById('dayOrigin').value = day.origin;
  document.getElementById('dayStops').value = day.templeNums.join(', ');
  document.getElementById('dayNote').value = day.note || '';
  document.getElementById('dayPlanStatus').textContent = day.customised
    ? 'Using your saved field plan for this date. The published itinerary remains unchanged.'
    : 'Changes stay in this browser and update this day’s map and ChatGPT prompt.';
}

function byDay(arr) {
  const m = new Map();
  for (const t of arr) { if (!m.has(t.day)) m.set(t.day, []); m.get(t.day).push(t); }
  return m;
}

function dayMeta(day) { return DAYS.find(d => d.day === day); }

function fillDayPick() {
  const sel = document.getElementById('dayPick');
  sel.innerHTML = '';
  const todayIso = new Date().toISOString().slice(0,10);
  const requestedDay = new URLSearchParams(window.location.search).get('day');
  let selected = DAYS.some(d => d.iso === requestedDay) ? requestedDay : DAYS[0].iso;
  for (const d of DAYS) {
    const opt = document.createElement('option');
    opt.value = d.iso;
    opt.textContent = d.label;
    if (!requestedDay && d.iso === todayIso) selected = d.iso;
    sel.appendChild(opt);
  }
  // If outside the trip window, default to the first day unless the URL names one.
  if (!requestedDay && !DAYS.some(d => d.iso === todayIso)) selected = DAYS[0].iso;
  sel.value = selected;
  updateToday();
  sel.addEventListener('change', updateToday);
}

function selectedDayPrompt() {
  const iso = document.getElementById('dayPick').value;
  const day = workingDay(DAYS.find(d => d.iso === iso));
  const stops = day.templeNums.map(num => TEMPLES.find(t => t.num === num)).filter(Boolean);
  return [
    'Optimise this Bandō 33 pilgrimage day for me.',
    'Date: ' + day.day + ' (' + day.iso + ')',
    'Start: ' + day.origin,
    'Stops in order: ' + stops.map(t => '#' + t.num + ' ' + t.romaji + ' (' + t.city + ')').join(' → '),
    'Current plan: ' + day.blurb,
    ...(day.note ? ['Field note: ' + day.note] : []),
    'Available light: sunrise ' + DAYLIGHT[iso].sunrise + ', sunset ' + DAYLIGHT[iso].sunset + ', civil dusk ' + DAYLIGHT[iso].civilDusk + '.',
    'Please identify timing risks, suggest a better order or transport plan, and flag anything I should verify. Keep the answer practical and concise.'
  ].join('\n');
}

document.getElementById('copyPrompt').addEventListener('click', async () => {
  const prompt = selectedDayPrompt();
  try {
    await navigator.clipboard.writeText(prompt);
    document.getElementById('copyPrompt').textContent = 'Copied';
    setTimeout(() => { document.getElementById('copyPrompt').textContent = 'Ask ChatGPT'; }, 1600);
  } catch {
    window.prompt('Copy this prompt into ChatGPT:', prompt);
  }
});

function updateToday() {
  const iso = document.getElementById('dayPick').value;
  const d = workingDay(DAYS.find(x => x.iso === iso));
  const url = new URL(window.location.href);
  url.searchParams.set('day', iso);
  window.history.replaceState({}, '', url);
  if (activeWeek !== 'all' && weekKey(d.iso) !== activeWeek) {
    activeWeek = weekKey(d.iso);
    fillWeekNav();
    render();
  }
  const a = document.getElementById('todayMap');
  a.href = routeMapUrl(d);
  a.textContent = '↗';
  a.title = 'Open map · ' + d.day;
  a.setAttribute('aria-label', 'Open map · ' + d.day);
  document.getElementById('todaySummary').textContent =
    'From ' + d.origin + ' → temples #' + d.templeNums.join(', #') +
    (d.note ? ' · ' + d.note : '') + (d.customised ? ' · FIELD PLAN' : '');
  renderDaylightCycle(document.getElementById('todayDaylight'), iso);
  fillDayPlanForm(d);
  // highlight
  document.querySelectorAll('.day').forEach(el => {
    el.classList.toggle('highlight', el.dataset.day === d.day);
  });
  const target = document.querySelector('.day[data-day="' + d.day + '"]');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('dayPlanForm').addEventListener('submit', event => {
  event.preventDefault();
  const iso = document.getElementById('dayPick').value;
  const baseDay = DAYS.find(day => day.iso === iso);
  const status = document.getElementById('dayPlanStatus');
  const templeNums = [...new Set(
    document.getElementById('dayStops').value
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
  )];
  const invalid = templeNums.filter(num => !Number.isInteger(num) || !TEMPLES.some(temple => temple.num === num));
  if (!templeNums.length || invalid.length) {
    status.textContent = invalid.length
      ? 'Check the temple numbers: ' + invalid.join(', ') + '.'
      : 'Add at least one temple number for this day.';
    return;
  }
  const origin = document.getElementById('dayOrigin').value.trim();
  if (!origin) {
    status.textContent = 'Add a starting place for the route.';
    return;
  }
  dayPlans[iso] = {
    origin,
    templeNums,
    note: document.getElementById('dayNote').value.trim()
  };
  saveDayPlans();
  updateToday();
  status.textContent = 'Saved for ' + baseDay.day + '. Map and prompt now use this field plan.';
});

document.getElementById('restoreDay').addEventListener('click', () => {
  const iso = document.getElementById('dayPick').value;
  delete dayPlans[iso];
  saveDayPlans();
  updateToday();
  document.getElementById('dayPlanStatus').textContent = 'Restored the published plan for this date.';
});

function render() {
  const list = document.getElementById('list');
  list.innerHTML = '';
  const days = byDay(TEMPLES);
  let done = 0;
  for (const t of TEMPLES) if (state[t.num]) done++;
  document.getElementById('count').textContent = done + ' / ' + TEMPLES.length;
  document.getElementById('bar').style.width = (100 * done / TEMPLES.length) + '%';
  window.dispatchEvent(new CustomEvent('bando:progress', { detail: { done, total: TEMPLES.length, state } }));

  const totals = Object.values(FARES).reduce((sum, fare) => {
    const amounts = fare.match(/[0-9,]+/g).slice(0, 2).map(value => Number(value.replace(/,/g, '')));
    return [sum[0] + amounts[0], sum[1] + amounts[1]];
  }, [0, 0]);
  document.getElementById('totalText').textContent =
    '¥' + totals[0].toLocaleString('en-GB') + '–¥' + totals[1].toLocaleString('en-GB') +
    ' for the planned 33-stop itinerary. Excludes taxis, hire cars, reserved-seat / limited-express / Shinkansen supplements, admissions, and any separate overnight travel.';

  for (const [day, temples] of days) {
    const meta = dayMeta(day);
    if (activeWeek !== 'all' && (!meta || weekKey(meta.iso) !== activeWeek)) continue;
    const section = renderDayCard({
      day, temples, meta, filter, state, fares: FARES, recheck: RECHECK,
      onToggle: (num, checked) => { state[num] = checked; if (!checked) delete state[num]; save(); render(); }
    });
    if (section.querySelector('.card') || filter === 'all') list.appendChild(section);
  }
  observeMasonry();
}

document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all stamps?')) { for (const k of Object.keys(state)) delete state[k]; save(); render(); }
});
document.getElementById('export').addEventListener('click', () => {
  const stamped = TEMPLES.filter(t => state[t.num]).map(t => '#' + t.num + ' ' + t.jp + ' ' + t.romaji);
  const text = 'Bandō 33 納経軸 progress\n' + stamped.length + '/33 stamped\n\n' + (stamped.join('\n') || '(none yet)');
  navigator.clipboard?.writeText(text);
  alert(text);
});

fillWeekNav();
render();
fillDayPick();

window.BANDO33.daylight = DAYLIGHT;
window.BANDO33.dayPlans = dayPlans;
