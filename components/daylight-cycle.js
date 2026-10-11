import { DAYLIGHT, minutesLabel, moonPhase, timeToMinutes } from '../data/daylight.js';

export function renderDaylightCycle(container, iso, { compact = false } = {}) {
  const daylight = DAYLIGHT[iso];
  if (!container || !daylight) return;

  const sunrise = timeToMinutes(daylight.sunrise);
  const sunset = timeToMinutes(daylight.sunset);
  const duration = sunset - sunrise;
  const lightAfterStamps = Math.max(0, sunset - (16 * 60));
  const moon = moonPhase(iso);

  container.classList.add('daylight-cycle');
  container.classList.toggle('daylight-cycle--compact', compact);
  container.innerHTML = `
    <div class="daylight-cycle__head">
      <span>日照 · DAYLIGHT</span>
      <strong>${minutesLabel(duration)}</strong>
    </div>
    <div class="daylight-cycle__orbit" aria-hidden="true">
      <i class="daylight-cycle__sun">☀</i>
      <i class="daylight-cycle__moon">${moon.symbol}</i>
    </div>
    <div class="daylight-cycle__times">
      <span><b>${daylight.sunrise}</b> sunrise</span>
      <span><b>16:00</b> stamp target</span>
      <span><b>${daylight.sunset}</b> sunset</span>
    </div>
    <p>${lightAfterStamps} min of light after the stamp target · civil dusk ${daylight.civilDusk} · ${moon.label}</p>`;
}

export function createDaylightCycle(iso, options) {
  const element = document.createElement('div');
  renderDaylightCycle(element, iso, options);
  return element;
}
