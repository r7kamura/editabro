export interface TextChange {
  from: number;
  to: number;
  insert: string;
}

// Returns the smallest single replacement that turns `current` into `next`.
export function diff(current: string, next: string): TextChange | null {
  if (current === next) return null;
  let start = 0;
  const max = Math.min(current.length, next.length);
  while (start < max && current[start] === next[start]) start++;
  let end = 0;
  while (
    end < max - start &&
    current[current.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++;
  }
  return {
    from: start,
    to: current.length - end,
    insert: next.slice(start, next.length - end),
  };
}
