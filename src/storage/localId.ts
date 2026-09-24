let next = 0;

export function localId(): string {
  next += 1;
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 12);
  return `${time}-${next.toString(36)}-${random}`;
}
