import { mountTemplePreview } from './temple-preview.js';

const KANJI_DIGITS = ['〇','一','二','三','四','五','六','七','八','九'];

function japaneseNumber(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 99) return String(value);
  if (number < 10) return KANJI_DIGITS[number];
  const tens = Math.floor(number / 10);
  const ones = number % 10;
  return `${tens > 1 ? KANJI_DIGITS[tens] : ''}十${ones ? KANJI_DIGITS[ones] : ''}`;
}

function goshuinDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const era = year >= 2019 ? `令和${japaneseNumber(year - 2018)}` : String(year);
  return `${era}年${japaneseNumber(month)}月${japaneseNumber(day)}日`;
}

export function renderDayCard({ day, temples, meta, mapUrl, filter, state, fares, recheck, onToggle }) {
  const section = document.createElement('section');
  section.className = 'day';
  section.dataset.day = day;
  section.id = 'day-' + (meta ? meta.iso : day);
  section.dataset.date = meta ? `${Number(meta.iso.slice(5, 7))}月${Number(meta.iso.slice(8, 10))}日` : day;

  const heading = document.createElement('h2');
  heading.textContent = meta ? meta.day : day;
  section.appendChild(heading);

  if (meta) {
    const mapButton = document.createElement('a');
    mapButton.className = 'btn mapday day-map-link';
    mapButton.href = mapUrl || meta.mapUrl;
    mapButton.target = '_blank';
    mapButton.rel = 'noopener';
    mapButton.textContent = 'Open route map  ↗';
    mapButton.title = 'Open map · ' + meta.day + ' · ' + temples.length + ' stops';
    mapButton.setAttribute('aria-label', 'Open map · ' + meta.day + ' · ' + temples.length + ' stops');
    section._mapButton = mapButton;
  }

  for (const temple of temples) {
    const stamped = !!state[temple.num];
    if (filter === 'todo' && stamped) continue;
    if (filter === 'done' && !stamped) continue;

    const card = document.createElement('article');
    const closed = (temple.hours || '').includes('CLOSED') || temple.hours === 'CLOSED';
    const warning = recheck[temple.num];
    card.className = 'card' + (stamped ? ' done' : '') + (closed ? ' closed' : '') + (warning ? ' recheck' : '');
    const hoursClass = closed ? 'closed' : ((temple.hours || '').includes('Verify') ? 'unknown' : '');
    const travelLine = temple.travel || temple.today || '';
    const fromShinjuku = temple.fromShinjuku || '';
    const visitDate = goshuinDate(meta?.iso);
    card.innerHTML = `
      <div class="temple-goshuin">
        <div class="temple-card-top">
          <span class="num">${String(temple.num).padStart(2,'0')}</span>
          <label class="stamp-toggle">
            <input class="check" type="checkbox" ${stamped ? 'checked' : ''} aria-label="Stamped #${temple.num}"/>
            <span>${stamped ? 'Stamped' : 'Mark stamped'}</span>
          </label>
        </div>
        <canvas class="temple-preview" width="320" height="220" role="img" aria-label="Rotating miniature of ${temple.romaji}"></canvas>
        <span class="goshuin-round-seal" aria-hidden="true"><small>坂東</small><strong>${japaneseNumber(temple.num)}</strong><small>霊場</small></span>
        <span class="goshuin-devotion" aria-hidden="true">奉拝</span>
        ${visitDate ? `<span class="goshuin-date" aria-hidden="true">${visitDate}</span>` : ''}
        <h3 class="name"><span class="jp">${temple.jp}</span><span class="romaji">${temple.romaji}</span></h3>
        ${temple.alt ? `<p class="temple-alt">別称 ${temple.alt}</p>` : ''}
        <span class="goshuin-square-seal" aria-hidden="true"><small>坂東</small><strong>${String(temple.num).padStart(2,'0')}</strong><small>札所</small></span>
      </div>
      <div class="temple-facts">
        <div class="temple-fact temple-location"><span class="fact-icon" aria-hidden="true">⌖</span><span>${temple.city}</span></div>
        ${warning ? `<div class="temple-fact temple-warning"><span class="fact-icon" aria-hidden="true">!</span><span>${warning}</span></div>` : ''}
        ${temple.notes ? `<div class="temple-fact temple-warning"><span class="fact-icon" aria-hidden="true">!</span><span>${temple.notes}</span></div>` : ''}
        <div class="temple-fact hours ${hoursClass}"><span class="fact-icon stamp-icon" aria-hidden="true">印</span><span><strong>Stamp</strong> · ${temple.hours || 'Verify on site'}</span></div>
      </div>
      <div class="actions"><a class="btn" href="${temple.maps}" target="_blank" rel="noopener">Open temple map  ↗</a></div>
      <details class="temple-more">
        <summary>More information &amp; journey</summary>
        <div class="temple-more-panel">
          ${meta ? `<div class="journey-detail"><span>Map starts at</span><p>${meta.origin}</p></div>` : ''}
          ${meta?.blurb ? `<div class="journey-overview">${meta.blurb}</div>` : ''}
          ${temple.arriveBy ? `<div class="journey-detail"><span>Be there by</span><p>${temple.arriveBy}</p></div>` : ''}
          ${travelLine ? `<div class="journey-detail"><span>Today</span><p>${travelLine}</p></div>` : ''}
          ${fromShinjuku ? `<div class="journey-detail"><span>From Shinjuku</span><p>${fromShinjuku}</p></div>` : ''}
          ${fares[temple.num] ? `<div class="journey-detail"><span>Estimated transport</span><p>${fares[temple.num]}</p></div>` : ''}
        </div>
      </details>`;
    card.querySelector('.check').addEventListener('change', (event) => onToggle(temple.num, event.target.checked));
    mountTemplePreview(card.querySelector('.temple-preview'),temple);
    section.appendChild(card);
  }

  if (section._mapButton) section.appendChild(section._mapButton);
  return section;
}
