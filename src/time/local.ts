import { dayKeyFromDate } from '../domain/summary';

export function formatLocalInput(iso: string): string {
  const date = new Date(iso);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${dayKeyFromDate(date)} ${hours}:${minutes}:${seconds}`;
}

export function parseLocalInput(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value.trim(),
  );
  if (!match) {
    return null;
  }
  const seconds = match[4] === undefined ? 0 : Number(match[4]);
  const date = new Date(
    Number(match[1].slice(0, 4)),
    Number(match[1].slice(5, 7)) - 1,
    Number(match[1].slice(8, 10)),
    Number(match[2]),
    Number(match[3]),
    seconds,
    0,
  );
  if (
    Number.isNaN(date.getTime()) ||
    date.getHours() !== Number(match[2]) ||
    date.getMinutes() !== Number(match[3]) ||
    date.getSeconds() !== seconds
  ) {
    return null;
  }
  return date.toISOString();
}
