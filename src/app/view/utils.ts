// src/app/view/utils.ts
// Client-side utility functions for the view page

// Helper function to format tournament names from database format to display format
export function formatTournamentName(dbName: string): string {
  // Split by underscores
  const parts = dbName.split('_');

  // Capitalize each part and join with spaces
  const formatted = parts
    .map(part => {
      // Handle special cases
      if (part === 'cdc') return 'CDC';
      if (part === 'lca') return 'LCA';
      if (part === 'jq') return 'JQ';
      if (part === 'u20') return 'U20';
      if (part === 'games') return ''; // Remove 'games' suffix

      // Capitalize first letter of regular words
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .filter(part => part !== '') // Remove empty parts
    .join(' ');

  return formatted;
}

// Helper function to check if an item is "new" (created within the last 7 days)
export function isNewItem(createdAt: string | undefined): boolean {
  if (!createdAt) return false;

  const created = new Date(createdAt);
  const now = new Date();
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  return daysDiff <= 7;
}
