const TEAM_COLORS = [
  { light: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' }, dark: { bg: '#1E3A5F', text: '#93C5FD', border: '#1D4ED8' } },
  { light: { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' }, dark: { bg: '#064E3B', text: '#6EE7B7', border: '#065F46' } },
  { light: { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' }, dark: { bg: '#2E1065', text: '#C4B5FD', border: '#5B21B6' } },
  { light: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' }, dark: { bg: '#451A03', text: '#FCD34D', border: '#92400E' } },
  { light: { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' }, dark: { bg: '#4C0519', text: '#FDA4AF', border: '#9F1239' } },
  { light: { bg: '#CFFAFE', text: '#155E75', border: '#A5F3FC' }, dark: { bg: '#164E63', text: '#67E8F9', border: '#155E75' } },
  { light: { bg: '#FFEDD5', text: '#9A3412', border: '#FED7AA' }, dark: { bg: '#431407', text: '#FBB06E', border: '#9A3412' } },
  { light: { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' }, dark: { bg: '#1E1B4B', text: '#A5B4FC', border: '#3730A3' } },
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

export interface TeamColorSet {
  bg: string;
  text: string;
  border: string;
}

export function getTeamColor(teamId: string, theme: 'light' | 'dark' = 'light'): TeamColorSet {
  const idx = hashString(teamId) % TEAM_COLORS.length;
  return TEAM_COLORS[idx][theme];
}
