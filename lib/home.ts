export const NEW_HOME = 'https://mkingreads.promisevisuals.com';
const OLD_HOSTS = ['mkingreads.vercel.app', 'booknest-beacon-hill-academy.vercel.app'];

export function isOldHome(): boolean {
  return typeof window !== 'undefined' && OLD_HOSTS.includes(window.location.hostname);
}
