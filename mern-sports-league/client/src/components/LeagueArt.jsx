// Code-drawn SVG art in the Clay 3D + Broadcast sport style: a clay ball
// over diagonal broadcast stripes, with a score bug. No stock imagery.
export default function LeagueArt({ colour = 'pink', home = 'AZA', away = 'RVR', homeScore = 2, awayScore = 1 }) {
  const fills = { pink: '#FFC9D9', mint: '#BDEBCB', sky: '#BFE0FF', butter: '#FFE3A1', lilac: '#DCC9FF', peach: '#FFC9A3' };
  const fill = fills[colour] || fills.pink;
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Illustration of a clay football over broadcast stripes with a live score bug" className="league-art">
      <defs>
        <pattern id="diag" width="18" height="18" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill="#FFF6E9" />
          <rect width="9" height="18" fill="#FFE3A1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="400" height="300" rx="24" fill="url(#diag)" />
      <circle cx="200" cy="140" r="86" fill={fill} stroke="#221D16" strokeWidth="4" />
      <circle cx="200" cy="140" r="86" fill="none" stroke="#ffffff" strokeWidth="6" opacity="0.45" strokeDasharray="200 340" />
      <path d="M200 78 L214 122 L260 122 L223 148 L236 192 L200 166 L164 192 L177 148 L140 122 L186 122 Z" fill="#221D16" />
      <circle cx="200" cy="140" r="30" fill="#FFF6E9" stroke="#221D16" strokeWidth="4" />
      <circle cx="200" cy="140" r="10" fill="#221D16" />
      <g transform="rotate(-3 200 246)">
        <rect x="76" y="226" width="248" height="44" rx="10" fill="#141210" />
        <text x="102" y="255" fill="#FFF6E9" fontFamily="Archivo Black, sans-serif" fontSize="22" textAnchor="middle">{home}</text>
        <text x="172" y="255" fill="#FFD400" fontFamily="Archivo Black, sans-serif" fontSize="24" textAnchor="middle">{homeScore}</text>
        <text x="200" y="255" fill="#FFF6E9" fontFamily="Archivo Black, sans-serif" fontSize="20" textAnchor="middle">–</text>
        <text x="228" y="255" fill="#FFD400" fontFamily="Archivo Black, sans-serif" fontSize="24" textAnchor="middle">{awayScore}</text>
        <text x="298" y="255" fill="#FFF6E9" fontFamily="Archivo Black, sans-serif" fontSize="22" textAnchor="middle">{away}</text>
      </g>
      <g transform="rotate(6 330 60)">
        <rect x="296" y="38" width="76" height="30" rx="15" fill="#FF3B30" />
        <circle cx="312" cy="53" r="5" fill="#FFF6E9" />
        <text x="340" y="59" fill="#FFF6E9" fontFamily="Archivo, sans-serif" fontWeight="800" fontSize="13">LIVE</text>
      </g>
    </svg>
  );
}
