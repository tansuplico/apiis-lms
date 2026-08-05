// src/components/shared/BackgroundDecorationAlt.tsx
export default function BackgroundDecorationAlt() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-gray-50 dark:bg-gray-950"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <filter
            id="bgAltShadowLight"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="12"
              floodColor="#0f172a"
              floodOpacity="0.07"
            />
          </filter>
          <filter
            id="bgAltShadowDark"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="8"
              floodColor="#000000"
              floodOpacity="0.45"
            />
          </filter>
        </defs>

        {/* faint diagonal guide lines, following the same drift direction as the shapes */}
        <g className="stroke-gray-200 dark:stroke-gray-800" strokeWidth="1.5">
          <line x1="0" y1="120" x2="260" y2="380" />
          <line x1="1440" y1="180" x2="1180" y2="440" />
          <line x1="620" y1="0" x2="860" y2="240" />
        </g>

        {/* ── Light mode: two diagonal trails, top-left→bottom-right and top-right→bottom-left ── */}
        <g className="dark:hidden" filter="url(#bgAltShadowLight)">
          {/* trail 1: top-left corner drifting down toward center-left */}
          <rect
            x="-100"
            y="-60"
            width="300"
            height="105"
            rx="52"
            className="fill-white"
            transform="rotate(-38 50 -8)"
          />
          <circle cx="80" cy="150" r="46" className="fill-gray-100" />
          <rect
            x="10"
            y="220"
            width="260"
            height="90"
            rx="45"
            className="fill-gray-100"
            transform="rotate(-38 140 265)"
          />
          <circle cx="260" cy="420" r="34" className="fill-white" />
          <rect
            x="180"
            y="460"
            width="220"
            height="80"
            rx="40"
            className="fill-white"
            transform="rotate(-38 290 500)"
          />
          <circle cx="440" cy="640" r="28" className="fill-gray-100" />

          {/* trail 2: top-right corner drifting down toward center-right */}
          <rect
            x="1200"
            y="-40"
            width="320"
            height="105"
            rx="52"
            className="fill-gray-100"
            transform="rotate(38 1360 12)"
          />
          <circle cx="1320" cy="190" r="50" className="fill-white" />
          <rect
            x="1140"
            y="250"
            width="270"
            height="90"
            rx="45"
            className="fill-white"
            transform="rotate(38 1275 295)"
          />
          <circle cx="1090" cy="450" r="36" className="fill-gray-100" />
          <rect
            x="1000"
            y="490"
            width="230"
            height="80"
            rx="40"
            className="fill-gray-100"
            transform="rotate(38 1115 530)"
          />
          <circle cx="950" cy="660" r="26" className="fill-white" />

          {/* bottom edge accents, sparse — keep the top-center clear for page headers */}
          <circle cx="200" cy="850" r="60" className="fill-white" />
          <circle cx="1280" cy="870" r="44" className="fill-gray-100" />
        </g>

        {/* ── Dark mode: same trails, dark palette ── */}
        <g className="hidden dark:block" filter="url(#bgAltShadowDark)">
          <rect
            x="-100"
            y="-60"
            width="300"
            height="105"
            rx="52"
            className="fill-gray-800"
            transform="rotate(-38 50 -8)"
          />
          <circle cx="80" cy="150" r="46" className="fill-gray-900" />
          <rect
            x="10"
            y="220"
            width="260"
            height="90"
            rx="45"
            className="fill-gray-900"
            transform="rotate(-38 140 265)"
          />
          <circle cx="260" cy="420" r="34" className="fill-gray-800" />
          <rect
            x="180"
            y="460"
            width="220"
            height="80"
            rx="40"
            className="fill-gray-800"
            transform="rotate(-38 290 500)"
          />
          <circle cx="440" cy="640" r="28" className="fill-gray-900" />

          <rect
            x="1200"
            y="-40"
            width="320"
            height="105"
            rx="52"
            className="fill-gray-900"
            transform="rotate(38 1360 12)"
          />
          <circle cx="1320" cy="190" r="50" className="fill-gray-800" />
          <rect
            x="1140"
            y="250"
            width="270"
            height="90"
            rx="45"
            className="fill-gray-800"
            transform="rotate(38 1275 295)"
          />
          <circle cx="1090" cy="450" r="36" className="fill-gray-900" />
          <rect
            x="1000"
            y="490"
            width="230"
            height="80"
            rx="40"
            className="fill-gray-900"
            transform="rotate(38 1115 530)"
          />
          <circle cx="950" cy="660" r="26" className="fill-gray-800" />

          <circle cx="200" cy="850" r="60" className="fill-gray-800" />
          <circle cx="1280" cy="870" r="44" className="fill-gray-900" />
        </g>
      </svg>
    </div>
  );
}
