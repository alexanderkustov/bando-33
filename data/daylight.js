export const DAYLIGHT = {
  '2026-11-03': { sunrise: '06:04', sunset: '16:44', civilDusk: '17:11' },
  '2026-11-04': { sunrise: '06:05', sunset: '16:45', civilDusk: '17:12' },
  '2026-11-05': { sunrise: '06:08', sunset: '16:45', civilDusk: '17:12' },
  '2026-11-06': { sunrise: '06:08', sunset: '16:43', civilDusk: '17:10' },
  '2026-11-07': { sunrise: '06:10', sunset: '16:42', civilDusk: '17:09' },
  '2026-11-08': { sunrise: '06:10', sunset: '16:40', civilDusk: '17:07' },
  '2026-11-09': { sunrise: '06:15', sunset: '16:41', civilDusk: '17:08' },
  '2026-11-10': { sunrise: '06:13', sunset: '16:37', civilDusk: '17:04' },
  '2026-11-11': { sunrise: '06:15', sunset: '16:37', civilDusk: '17:04' },
  '2026-11-12': { sunrise: '06:13', sunset: '16:34', civilDusk: '17:01' },
  '2026-11-13': { sunrise: '06:14', sunset: '16:31', civilDusk: '16:58' },
  '2026-11-14': { sunrise: '06:14', sunset: '16:31', civilDusk: '16:58' },
  '2026-11-15': { sunrise: '06:16', sunset: '16:32', civilDusk: '16:59' },
  '2026-11-16': { sunrise: '06:16', sunset: '16:31', civilDusk: '16:58' },
  '2026-11-17': { sunrise: '06:14', sunset: '16:29', civilDusk: '16:56' },
  '2026-11-18': { sunrise: '06:17', sunset: '16:31', civilDusk: '16:58' },
  '2026-11-19': { sunrise: '06:18', sunset: '16:31', civilDusk: '16:58' },
  '2026-11-20': { sunrise: '06:18', sunset: '16:31', civilDusk: '16:58' }
};

export function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, '0')}m`;
}

export function moonPhase(iso) {
  const synodicMonth = 29.530588853;
  const knownNewMoon = Date.parse('2000-01-06T18:14:00Z');
  const date = Date.parse(`${iso}T03:00:00Z`);
  const age = (((date - knownNewMoon) / 86400000) % synodicMonth + synodicMonth) % synodicMonth;
  const index = Math.round((age / synodicMonth) * 8) % 8;
  const phases = [
    ['●', 'new moon'],
    ['☽', 'waxing crescent'],
    ['◐', 'first quarter'],
    ['◔', 'waxing gibbous'],
    ['○', 'full moon'],
    ['◕', 'waning gibbous'],
    ['◑', 'last quarter'],
    ['☾', 'waning crescent']
  ];
  return { symbol: phases[index][0], label: phases[index][1], age };
}
