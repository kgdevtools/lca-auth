// src/app/add-game/utils.ts

/**
 * Splits a PGN string that may contain multiple games into an array of individual PGN strings.
 * Each game is expected to start with an [Event "..."] tag and end with a result marker.
 * Properly handles annotations, time clock information, and varying newlines.
 * @param multiGamePgn The PGN string potentially containing multiple games.
 * @returns An array of individual PGN strings.
 */
export function splitMultiGamePgn(multiGamePgn: string): string[] {
  // First, normalize line endings to \n for consistent processing
  const normalizedPgn = multiGamePgn.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Find all positions where [Event tag appears at the start of a line (or after whitespace)
  const eventRegex = /^\s*\[Event\s+"/gm;
  const eventMatches = [];
  let match;

  while ((match = eventRegex.exec(normalizedPgn)) !== null) {
    eventMatches.push(match.index);
  }

  if (eventMatches.length === 0) {
    // No [Event tags found, return the whole string as one game if it has content
    return normalizedPgn.trim() ? [normalizedPgn.trim()] : [];
  }

  // Process the PGN content to split into games based on [Event tags and result markers
  const games = [];

  for (let i = 0; i < eventMatches.length; i++) {
    const start = eventMatches[i];
    // For each game, we only want content up to the result marker
    const currentGameRaw = i < eventMatches.length - 1
      ? normalizedPgn.substring(start, eventMatches[i + 1])
      : normalizedPgn.substring(start);

    // Find the end of the actual game by looking for result markers
    // Results can be: 1-0, 0-1, 1/2-1/2, * (wildcard), and may be followed by annotations in {}
    const gameEndRegex = /(1-0|0-1|1\/2-1\/2|\*)\s*(\{[^}]*\})?\s*(\n\s*\n|\r?\n\s*\r?\n|\s*$)/;
    const endMatch = gameEndRegex.exec(currentGameRaw);

    let gameContent;
    if (endMatch) {
      // Include the result and any annotations, but stop there
      const resultEndIndex = endMatch.index + endMatch[0].length;
      gameContent = currentGameRaw.substring(0, resultEndIndex).trim();
    } else {
      // If no result marker found, take the content until the next [Event tag or end of content
      const nextEventInContent = currentGameRaw.indexOf('[Event', '[Event'.length);
      if (nextEventInContent > 0) {
        gameContent = currentGameRaw.substring(0, nextEventInContent).trim();
      } else {
        gameContent = currentGameRaw.trim();
      }
    }

    if (gameContent.trim() !== '') {
      games.push(gameContent);
    }
  }

  return games;
}