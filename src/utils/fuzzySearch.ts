// Simple fuzzy search implementation
// Matches characters in order but allows gaps (e.g., "thereal" matches "Ethereal")

export interface SearchResult<T> {
  item: T;
  score: number;
  matches: number[]; // Indices of matched characters for highlighting
}

export function fuzzyMatch(query: string, target: string): { score: number; matches: number[] } | null {
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  if (queryLower.length === 0) {
    return { score: 1, matches: [] };
  }

  if (queryLower.length > targetLower.length) {
    return null;
  }

  const matches: number[] = [];
  let queryIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;
  let consecutiveBonus = 0;

  for (let i = 0; i < targetLower.length && queryIdx < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIdx]) {
      matches.push(i);

      // Scoring bonuses
      if (i === 0) {
        score += 10; // Start of string bonus
      }
      if (lastMatchIdx === i - 1) {
        consecutiveBonus += 5; // Consecutive match bonus
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }
      if (i > 0 && (targetLower[i - 1] === ' ' || targetLower[i - 1] === '-' || targetLower[i - 1] === '_')) {
        score += 8; // Word boundary bonus
      }

      score += 1; // Base score per match
      lastMatchIdx = i;
      queryIdx++;
    }
  }

  // All query characters must be found
  if (queryIdx !== queryLower.length) {
    return null;
  }

  // Bonus for shorter targets (more specific matches)
  score += Math.max(0, 20 - target.length);

  return { score, matches };
}

export function fuzzySearch<T>(
  query: string,
  items: T[],
  getSearchText: (item: T) => string
): SearchResult<T>[] {
  if (!query.trim()) {
    // Return all items with default score when no query
    return items.map(item => ({ item, score: 0, matches: [] }));
  }

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const text = getSearchText(item);
    const match = fuzzyMatch(query, text);
    if (match) {
      results.push({ item, score: match.score, matches: match.matches });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}
