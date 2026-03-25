const TEAM_COLORS = [
  { light: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' }, dark: { bg: '#3b0a0a', text: '#F87171', border: '#DC2626' } }, // Red
  { light: { bg: '#FFEDD5', text: '#EA580C', border: '#FDBA74' }, dark: { bg: '#3a1505', text: '#FB923C', border: '#EA580C' } }, // Orange
  { light: { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' }, dark: { bg: '#3b2900', text: '#FACC15', border: '#CA8A04' } }, // Yellow
  { light: { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' }, dark: { bg: '#052e16', text: '#4ADE80', border: '#16A34A' } }, // Green
  { light: { bg: '#CCFBF1', text: '#0D9488', border: '#5EEAD4' }, dark: { bg: '#031a16', text: '#2DD4BF', border: '#0D9488' } }, // Teal
  { light: { bg: '#CFFAFE', text: '#0891B2', border: '#67E8F9' }, dark: { bg: '#032830', text: '#22D3EE', border: '#0891B2' } }, // Cyan
  { light: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' }, dark: { bg: '#0d1f4e', text: '#60A5FA', border: '#2563EB' } }, // Blue
  { light: { bg: '#E0E7FF', text: '#4338CA', border: '#A5B4FC' }, dark: { bg: '#1e1b4b', text: '#818CF8', border: '#4338CA' } }, // Indigo
  { light: { bg: '#EDE9FE', text: '#7C3AED', border: '#C4B5FD' }, dark: { bg: '#2e1065', text: '#A78BFA', border: '#7C3AED' } }, // Violet
  { light: { bg: '#FAE8FF', text: '#A21CAF', border: '#E879F9' }, dark: { bg: '#3b0764', text: '#E879F9', border: '#A21CAF' } }, // Fuchsia
  { light: { bg: '#FCE7F3', text: '#DB2777', border: '#F9A8D4' }, dark: { bg: '#4a0020', text: '#F472B6', border: '#DB2777' } }, // Pink
  { light: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' }, dark: { bg: '#022c22', text: '#34D399', border: '#059669' } }, // Emerald
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
