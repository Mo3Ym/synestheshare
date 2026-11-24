// Shared by the classic result-page script and the OGP renderer.
function classifyColorType(colors) {
  const counts = {};
  for (const color of colors) counts[color] = (counts[color] || 0) + 1;
  const share = (...group) => group.reduce((sum, color) => sum + (counts[color] || 0), 0) / colors.length;
  const warm = share('#ff7f7f', '#ffae66', '#f5dc72');
  const cool = share('#4da8e8', '#8edfff', '#9272ff');
  const nature = share('#67bf92', '#a8d85c');
  const mono = share('#2b2d38', '#9698a8', '#fffdf9');
  const pastel = share('#fffdf9', '#8edfff', '#ee9fd0', '#f5dc72');
  const dream = share('#9272ff', '#ee9fd0', '#4da8e8');
  const earth = counts['#9f6f4f'] ? share('#9f6f4f', '#67bf92', '#a8d85c') : 0;

  if (mono >= 0.55) return 'mono';
  if (earth >= 0.4) return 'earth';
  if (pastel >= 0.55 && warm < 0.3 && cool < 0.3) return 'pastel';
  if (dream >= 0.5 && warm < 0.2) return 'dream';
  if (cool >= 0.5 && warm < 0.2) return 'cool';
  if (nature >= 0.45 && warm < 0.3) return 'nature';
  if (warm >= 0.45) return 'warm';
  if (warm >= 0.22 && cool >= 0.22) return 'neon';
  const scores = { warm, cool, nature, mono, dream, pastel };
  return Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
}

if (typeof module !== 'undefined') module.exports = classifyColorType;
