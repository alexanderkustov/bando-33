export function renderDayCard({ day, temples, meta, filter, state, fares, recheck, onToggle }) {
  const section = document.createElement('section');
  section.className = 'day';
  section.dataset.day = day;
  section.id = 'day-' + (meta ? meta.iso : day);
  section.dataset.date = meta ? `${Number(meta.iso.slice(5, 7))}月${Number(meta.iso.slice(8, 10))}日` : day;

  const heading = document.createElement('h2');
  heading.textContent = meta ? '巡礼' : day;
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

  if (meta) {
    const box = document.createElement('div');
    box.className = 'travel-box';
    box.innerHTML = '<strong>Map starts at:</strong> ' + meta.origin + (meta.blurb ? '<br>' + meta.blurb : '');
    section.appendChild(box);
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
      <input class="check" type="checkbox" ${stamped ? 'checked' : ''} aria-label="Stamped #${temple.num}"/>
      <div>
        ${warning ? `<div class="recheck-badge">⚠ ${warning}</div>` : ''}
        <span class="num">#${temple.num}</span>
        <div class="name">${temple.romaji}<span class="jp">${temple.jp}</span></div>
        <div class="meta">${temple.city}${alt}</div>
        ${temple.notes ? `<div class="notes">${temple.notes}</div>` : ''}
        <div class="hours ${hoursClass}">Stamp: ${temple.hours || 'Verify on site'}</div>
        ${temple.arriveBy ? `<div class="meta">Be there by <strong>${temple.arriveBy}</strong></div>` : ''}
        ${travelLine ? `<div class="travel">Today: ${travelLine}</div>` : ''}
        ${fromShinjuku ? `<div class="travel">From Shinjuku: ${fromShinjuku}</div>` : ''}
        ${fares[temple.num] ? `<div class="fare">Estimated transport: ${fares[temple.num]}</div>` : ''}
      </div>
      <div class="actions"><a class="btn" href="${temple.maps}" target="_blank" rel="noopener">Map  ↗</a></div>`;
    card.querySelector('.check').addEventListener('change', (event) => onToggle(temple.num, event.target.checked));
    section.appendChild(card);
  }

  if (section._mapButton) section.appendChild(section._mapButton);
  return section;
}
