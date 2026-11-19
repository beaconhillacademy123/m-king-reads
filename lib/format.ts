export const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;

export function hoursLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.round(minutes / 60);
  return `${h} hr${h === 1 ? '' : 's'}`;
}
