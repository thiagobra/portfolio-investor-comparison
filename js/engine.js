export function calculateDeviation(userAllocation, investorAllocation) {
  const deviations = {};
  let totalAbsDev = 0;

  const allKeys = new Set([
    ...Object.keys(userAllocation),
    ...Object.keys(investorAllocation),
  ]);

  for (const key of allKeys) {
    const userVal = userAllocation[key] || 0;
    const investorVal = investorAllocation[key] || 0;
    const diff = userVal - investorVal;
    deviations[key] = diff;
    totalAbsDev += Math.abs(diff);
  }

  // Similarity: 100 means identical. Divide by 2 because every overweight has a matching underweight.
  const similarityScore = Math.max(0, Math.min(100, 100 - totalAbsDev / 2));

  return { deviations, similarityScore };
}

export function generateSuggestions(deviations, investorName) {
  const suggestions = [];
  const threshold = 3;

  // Sort by absolute deviation descending
  const sorted = Object.entries(deviations)
    .map(([key, diff]) => ({ key, diff, abs: Math.abs(diff) }))
    .filter(d => d.abs >= threshold)
    .sort((a, b) => b.abs - a.abs);

  for (const { key, diff } of sorted) {
    if (diff > 0) {
      suggestions.push({
        type: 'decrease',
        text: `Reduce ${key} by ~${Math.abs(diff).toFixed(1)}% to align with ${investorName}`,
      });
    } else {
      suggestions.push({
        type: 'increase',
        text: `Increase ${key} by ~${Math.abs(diff).toFixed(1)}% to align with ${investorName}`,
      });
    }
  }

  return suggestions;
}
