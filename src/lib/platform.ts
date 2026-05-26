export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

export function isMobile(): boolean {
  return window.innerWidth < 1024 || isAndroid();
}
