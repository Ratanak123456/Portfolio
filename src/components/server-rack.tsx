export function ServerRack() {
  return (
    <figure className="mx-auto w-full max-w-xl text-hero-ink">
      <svg
        viewBox="0 0 560 550"
        role="img"
        aria-labelledby="server-rack-title server-rack-description"
        className="h-auto w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        data-rack-illustration
      >
        <title id="server-rack-title">Four-bay homelab server rack</title>
        <desc id="server-rack-description">
          A three-quarter view of one physical rack, showing its front and right
          side, four server units, drive trays, ventilation holes, and amber LEDs.
        </desc>
        <defs>
        </defs>
        <g strokeOpacity="0.2">
          <path d="M24 40V24H40 M520 24H536V40 M24 494V510H40 M520 510H536V494" />
          <path d="M66 492H474 M78 486V498 M462 486V498" />
        </g>

        {/* A single chassis: top, right side, and front share their edges. */}
        <g data-rack-chassis>
        <path d="M100 132L194 76H454L360 132Z" fill="var(--hero-background)" />
        <path d="M100 132L194 76H454L360 132Z" fill="currentColor" fillOpacity="0.025" />
        <path d="M360 132L454 76V426L360 482Z" fill="var(--hero-background)" />
        <path d="M360 132L454 76V426L360 482Z" fill="currentColor" fillOpacity="0.04" />
        <path d="M100 132H360V482H100Z" fill="var(--hero-background)" />
        <path d="M110 143H350V470H110Z" strokeOpacity="0.35" />
        <path d="M124 143V470 M336 143V470" strokeOpacity="0.25" />
        <path d="M112 132L206 76 M348 132L442 76" strokeOpacity="0.2" />
        <path d="M374 150L439 111V409L374 448Z" strokeOpacity="0.25" />

        {/* Four horizontal units, each with two drive trays and punched vents. */}
        {[0, 1, 2, 3].map((bay) => (
          <g key={bay} transform={`translate(0 ${bay * 78})`} data-rack-bay={bay + 1}>
            <path d="M116 150H344V216H116Z" fill="var(--hero-background)" />
            <path d="M116 150H344V158H116Z" fill="currentColor" fillOpacity="0.035" strokeOpacity="0.2" />
            <path d="M129 168H210V183H129Z M129 188H210V203H129Z" strokeOpacity="0.65" />
            <path d="M136 172V179 M136 192V199 M145 175H199 M145 195H199" strokeOpacity="0.3" />
            {[0, 1, 2].map((row) => (
              <g key={row} strokeOpacity="0.4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((column) => (
                  <circle key={column} cx={229 + column * 10} cy={174 + row * 10} r="1.4" />
                ))}
              </g>
            ))}
            <path d="M120 175V192 M340 175V192" strokeWidth="2" />
            <circle data-rack-led cx="322" cy="176" r="2.3" fill="var(--color-hero-amber)" stroke="none" />
            <circle cx="322" cy="187" r="1.5" strokeOpacity="0.4" />
            <path d="M318 200H326" strokeOpacity="0.35" />
            <circle cx="120" cy="154" r="1.2" strokeOpacity="0.5" />
            <circle cx="340" cy="211" r="1.2" strokeOpacity="0.5" />
          </g>
        ))}

        <g strokeOpacity="0.4">
          {Array.from({ length: 13 }, (_, row) => (
            <path key={row} d={`M390 ${191 + row * 14}L426 ${169 + row * 14}`} />
          ))}
          <path d="M392 390L420 373 M392 398L420 381" />
          <circle cx="444" cy="118" r="2" />
          <circle cx="444" cy="411" r="2" />
        </g>
        <path d="M110 482V494H134V482 M326 482V494H350V482 M432 439V451L447 442V430" fill="var(--hero-background)" />
        <path d="M100 459H360 M360 459L454 403" strokeOpacity="0.25" />
        <path
          data-rack-signal
          d="M322 176H330V410H322"
          pathLength="1"
          stroke="var(--color-hero-amber)"
          strokeOpacity="0.6"
          strokeDasharray="1"
          strokeDashoffset="0"
        />
        </g>
      </svg>
      <figcaption className="flex justify-between gap-4 border-t border-hero-ink/20 pt-4 font-technical font-normal text-[9px] tracking-[0.1em] sm:text-[10px]">
        <span>FIG. 01</span>
        <span className="text-right">HOMELAB SERVER RACK</span>
      </figcaption>
    </figure>
  );
}
