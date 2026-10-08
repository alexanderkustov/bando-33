import { mountTemplePreview } from './temple-preview.js';

export function renderDayCard({ day, temples, meta, filter, state, fares, recheck, onToggle }) {
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
    mapButton.href = meta.mapUrl;
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
    const alt = temple.alt ? ' · also ' + temple.alt : '';
    const travelLine = temple.travel || temple.today || '';
    const fromShinjuku = temple.fromShinjuku || '';
    card.innerHTML = `
      <div class="temple-card-top">
        <span class="num">${String(temple.num).padStart(2,'0')}</span>
        <label class="stamp-toggle">
          <input class="check" type="checkbox" ${stamped ? 'checked' : ''} aria-label="Stamped #${temple.num}"/>
          <span>${stamped ? 'Stamped' : 'Mark stamped'}</span>
        </label>
      </div>
      <h3 class="name">${temple.romaji}<span class="jp">${temple.jp}</span></h3>
      ${temple.alt ? `<p class="temple-alt">Also known as ${temple.alt}</p>` : ''}
      <div class="temple-preview-frame">
        <canvas class="temple-preview" width="320" height="220" role="img" aria-label="Rotating miniature of ${temple.romaji}"></canvas>
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
