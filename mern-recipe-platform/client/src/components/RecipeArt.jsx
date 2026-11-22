// Code-drawn SVG food motifs in the Organic nature palette — one per cuisine.
// No stock imagery; each motif is a flat, hand-drawn shape on a blob ground.
const GROUNDS = ['#ede2c9', '#e8f0e6', '#f6e3d8', '#f3e7c8', '#e3ecdd', '#f0e4d4'];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function Motif({ cuisine }) {
  switch (cuisine) {
    case 'Italian':
      return (
        <g>
          <ellipse cx="75" cy="78" rx="52" ry="16" fill="#fffaf0" />
          <path d="M30 74 Q75 40 120 74" fill="none" stroke="#c4552d" strokeWidth="9" strokeLinecap="round" />
          <path d="M42 68 Q75 44 108 68" fill="none" stroke="#d9a441" strokeWidth="6" strokeLinecap="round" />
          <circle cx="60" cy="58" r="7" fill="#4a7c59" />
          <circle cx="92" cy="56" r="6" fill="#2f5d3f" />
        </g>
      );
    case 'Mexican':
      return (
        <g>
          <path d="M28 96 Q75 20 122 96 Q100 84 75 88 Q50 84 28 96Z" fill="#d9a441" />
          <path d="M45 78 Q75 30 105 78" fill="none" stroke="#a8431f" strokeWidth="5" strokeLinecap="round" />
          <circle cx="62" cy="66" r="6" fill="#4a7c59" />
          <circle cx="86" cy="70" r="5" fill="#c4552d" />
        </g>
      );
    case 'Chinese':
      return (
        <g>
          <rect x="28" y="46" width="94" height="10" rx="5" fill="#4b3524" transform="rotate(-8 75 51)" />
          <rect x="28" y="62" width="94" height="10" rx="5" fill="#4b3524" transform="rotate(-8 75 67)" />
          <path d="M40 84 Q75 66 110 84" fill="none" stroke="#c4552d" strokeWidth="7" strokeLinecap="round" />
          <path d="M52 92 Q75 78 98 92" fill="none" stroke="#d9a441" strokeWidth="5" strokeLinecap="round" />
        </g>
      );
    case 'Thai':
      return (
        <g>
          <path d="M45 30 Q75 12 105 30 Q112 62 75 96 Q38 62 45 30Z" fill="#4a7c59" />
          <path d="M75 30 L75 88" stroke="#2f5d3f" strokeWidth="3" />
          <path d="M58 44 Q75 52 92 44" fill="none" stroke="#f6f0e2" strokeWidth="3" strokeLinecap="round" />
          <path d="M58 62 Q75 70 92 62" fill="none" stroke="#f6f0e2" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'Mediterranean':
      return (
        <g>
          <circle cx="75" cy="60" r="30" fill="#2f5d3f" />
          <circle cx="75" cy="60" r="20" fill="#4a7c59" />
          <circle cx="75" cy="60" r="10" fill="#8ba888" />
          <path d="M45 88 Q75 76 105 88" fill="none" stroke="#c4552d" strokeWidth="6" strokeLinecap="round" />
          <circle cx="52" cy="98" r="5" fill="#a8431f" />
          <circle cx="98" cy="98" r="5" fill="#a8431f" />
        </g>
      );
    case 'Indian':
    default:
      return (
        <g>
          <path d="M32 78 Q75 34 118 78 Q118 104 75 104 Q32 104 32 78Z" fill="#c4552d" />
          <path d="M44 76 Q75 48 106 76" fill="none" stroke="#f6f0e2" strokeWidth="5" strokeLinecap="round" />
          <circle cx="60" cy="66" r="6" fill="#d9a441" />
          <circle cx="88" cy="64" r="6" fill="#4a7c59" />
          <path d="M70 104 L78 116 L86 104" fill="none" stroke="#4b3524" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
  }
}

export default function RecipeArt({ cuisine, title }) {
  const ground = GROUNDS[hash(cuisine || 'x') % GROUNDS.length];
  return (
    <span className="deck-art" role="img" aria-label={`Illustration for ${title || cuisine || 'recipe'}`}>
      <svg viewBox="0 0 150 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="150" height="120" fill={ground} />
        <path d="M8 14 Q40 -6 66 12 Q92 30 70 48 Q48 62 20 44 Q-2 30 8 14Z" fill="#fffaf0" opacity="0.55" />
        <circle cx="132" cy="18" r="16" fill="#d9a441" opacity="0.35" />
        <Motif cuisine={cuisine} />
      </svg>
    </span>
  );
}
