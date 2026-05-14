const BLOCKED_PATTERNS = [
  /\brape\b/i,
  /\bgenerous\b/i,
  /\bpnp\b/i,
  /p&p/i,
  /p\/p/i,
  /\bmassage\b/i,
  /ma\$\$age/i,
];

export function containsBlockedWord(text: string): boolean {
  return BLOCKED_PATTERNS.some(re => re.test(text));
}

export function filterBlockedWords(text: string): string {
  let result = text;
  for (const re of BLOCKED_PATTERNS) {
    result = result.replace(re, match => '*'.repeat(match.length));
  }
  return result;
}
