import type { ReactNode } from "react";

// Separate, code-native drawings. No text or rack image is embedded in the art.
function Pencil({ d, opacity = .56, width = .75 }: { d: string; opacity?: number; width?: number }) {
  return <g fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} strokeOpacity={opacity} strokeWidth={width} />
    <path d={d} transform="translate(1.3 .9)" strokeOpacity={opacity * .27} strokeWidth={width * .65} />
  </g>;
}
function Drawing({ children, viewBox, className = "" }: { children: ReactNode; viewBox: string; className?: string }) {
  return <svg className={`ssh-drawing ${className}`} viewBox={viewBox} preserveAspectRatio="none" fill="none" aria-hidden="true">{children}</svg>;
}
function Hatching({ id }: { id: string }) {
  return <defs>
    <pattern id={id} width="31" height="37" patternUnits="userSpaceOnUse">
      <path d="M-6 28 21-3M4 42 33 8M23 41l12-14M-2 10l10-12" stroke="#000" strokeWidth=".55" strokeOpacity=".36" />
      <path d="m1 5 15 13m2 9 10 9m-17-9 3-5" stroke="#000" strokeWidth=".4" strokeOpacity=".16" />
    </pattern>
  </defs>;
}
function Recess({ y, height, id }: { y: number; height: number; id: string }) {
  const x = 43, right = 457, bottom = y + height, inset = 19;
  return <g data-recess-panel>
    <path d={`M${x} ${y}H${right}V${bottom}H${x}Z`} fill="#fff" />
    {/* The upper and left cut faces receive the shadow of the raised rails. */}
    <path d={`M${x} ${y}H${right}L${right-inset} ${y+inset}H${x+inset}V${bottom-inset}L${x} ${bottom}Z`} fill={`url(#${id})`} />
    <Pencil d={`M${x} ${y+1}Q251 ${y-1} ${right} ${y}L${right-1} ${bottom}Q250 ${bottom+1} ${x} ${bottom-1}Z`} opacity={.72} />
    <Pencil d={`M${x+inset} ${y+inset}Q244 ${y+inset+1} ${right-inset} ${y+inset-1}L${right-inset+1} ${bottom-inset}L${x+inset} ${bottom-inset+1}Z`} opacity={.53} />
    <Pencil d={`M${x} ${y}l${inset} ${inset}M${right} ${y}l-${inset} ${inset}M${right} ${bottom}l-${inset}-${inset}M${x} ${bottom}l${inset}-${inset}`} opacity={.48} />
    <Pencil d={`M${x+inset+3} ${y+inset+4}V${bottom-inset-2}M${x+inset+4} ${y+inset+3}H${right-inset-3}`} opacity={.34} width={.55} />
    <Pencil d={`M${right-8} ${y+9}V${bottom-7}H${x+9}`} opacity={.23} width={.45} />
  </g>;
}
export function DoorLeafDrawing({ side }: { side: "left" | "right" }) {
  const id = `ssh-leaf-hatch-${side}`;
  const offset = side === "left" ? 0 : 23;
  return <Drawing viewBox="0 0 500 1000" className="ssh-leaf-drawing">
    <Hatching id={id} />
    <path d="M0 0H500V1000H0Z" fill="#fff" />
    <Pencil d="M2 3 498 2 499 998 1 999Z M10 7l-1 983M491 8l1 981" opacity={.45} />
    <Recess y={55} height={552} id={id} />
    <Recess y={674} height={264} id={id} />
    <g stroke="#000" strokeOpacity=".21" strokeWidth=".5" fill="none" strokeLinecap="round">
      <path d={`M${108+offset} 116q-4 91 0 167t-1 133m4-200q3 47 0 92M${319-offset} 158q5 65 1 109t2 105m-5-43q-1 43 1 68M${207+offset} 432q-3 29 0 82m4-35 0 45`} />
      <path d={`M${130+offset} 726q-3 40 0 85m5-64-1 51M${350-offset} 758q4 34 0 74M26 123q-4 65 0 123m0 147q2 49 0 84M475 647q3 49 0 103M181 637q80-3 156 0`} />
    </g>
    <Pencil d="M499 8q-1 234 0 449t0 539" opacity={.6} width={.7} />
  </Drawing>;
}
export function FrameDrawing() {
  return <Drawing viewBox="0 0 1000 1000" className="ssh-frame-drawing">
    <Hatching id="ssh-frame-hatch" />
    {/* Everything is outside the opening. The inner hole is transparent. */}
    <path d="M-73-91H1073V1044H-73Z M0 0V1000H1000V0Z" fill="#fff" fillRule="evenodd" />
    <path d="M-48-64H1048V-31H-25V1010H-48Z M1000-1H1026V1012H1000Z" fill="url(#ssh-frame-hatch)" />
    <path d="M-17-17H1018V0H0V1001H-17Z" fill="url(#ssh-frame-hatch)" />
    <g stroke="#000" strokeWidth=".65" strokeOpacity=".25" strokeLinecap="round">
      {Array.from({ length: 43 }, (_, i) => {
        const y = i * 23 + (i % 3) * 2;
        return <path key={i} d={`M${-15 + i % 3} ${y + 13}l${11 + i % 4}-${12 + i % 5}`} />;
      })}
    </g>
    <path d="M1054-70h18v1112h-15Z M-57 1023H1072V1046H-57Z" fill="url(#ssh-frame-hatch)" opacity=".66" />
    <Pencil d="M-73 1037-72-91Q494-93 1072-90L1073 1043M-61 1022-60-78H1060L1061 1028" opacity={.64} />
    <Pencil d="M-49 1009-48-64H1048L1049 1016M-26 1007-25-32Q484-34 1025-31L1026 1012" opacity={.72} />
    <Pencil d="M-14 1001-16-17H1016V1004M0 998 0 0Q492-1 1000 0V1000" opacity={.85} width={.9} />
    <Pencil d="M-71-91-48-64-25-32 0 0M1072-90l-24 26-23 33-25 31M-72 1040l47-31 25-9M1072 1041l-46-29-26-12" opacity={.48} />
    <Pencil d="M-55 12q-3 103 0 221m-4-158q2 46 0 91M1041 72q-4 101-1 198m-2 254q3 65 0 137M1037 701q4 61 1 122M130-51q152-4 265-1m69 1 157-1M715-51q95 2 166-1" opacity={.2} width={.5} />
    {/* Threshold: back edge, sloping tread, front lip and grounded hatching. */}
    <path d="M0 1000H1000L1041 1036H-41Z" fill="#fff" />
    <path d="M-41 1036H1041V1048H-41Z" fill="url(#ssh-frame-hatch)" />
    <Pencil d="M0 1000q505 2 1000 0l41 36q-546-2-1082 0ZM-41 1048H1042M-19 1024q504-2 1039 0" opacity={.62} />
    <Pencil d="M72 1011q172-3 340 0m160 4q199-4 358-1" opacity={.2} width={.55} />
  </Drawing>;
}
export function WallMarks() {
  return <Drawing viewBox="0 0 1000 1000" className="ssh-wall-marks">
    <g stroke="#000" strokeWidth=".5" strokeOpacity=".12" strokeLinecap="round">
      <path d="m91 303 18-22m-11 28 23-28m-19 36 14-17M840 221l18-22m-8 30 18-21M144 658l20-22m-13 30 20-23M830 697l25-26m-17 32 28-30m-17 36 20-23" />
      <path d="m152 201 7-2m-54 354 10 1m745-192 6-1m-3 213 10 1M272 115l17 1m377-10 11-1" strokeOpacity=".09" />
    </g>
  </Drawing>;
}
export function FloorDrawing() {
  return <Drawing viewBox="0 0 1000 1000" className="ssh-floor-drawing">
    <Pencil d="M284 0Q156 450-24 1000M429 0Q395 415 331 1000M574 0q50 459 145 1000M718 0q156 455 324 1000" opacity={.22} width={.65} />
    <Pencil d="M0 347q464-5 1000 1M0 864q467 4 1000-2" opacity={.15} width={.55} />
    <g stroke="#000" strokeWidth=".5" strokeOpacity=".12" fill="none" strokeLinecap="round">
      <path d="m52 668 25-54m-12 59 29-66m723-344 20 40m-11-54 25 47M219 467l-14 39m-2 26-18 47M790 732l22 52m-12-54 31 76M464 211l-2 71m5-43-1 41" />
      <path d="M277 63q213 4 460-1m-422 11q164 5 370 0m-353 11q164 3 329 0m-314 9h302" strokeOpacity=".19" />
    </g>
  </Drawing>;
}
export function KeyShadowDrawing() {
  return <Drawing viewBox="0 0 120 28">
    <g stroke="#000" strokeWidth="1.1" strokeLinecap="round" strokeOpacity=".55">
      <path d="m9 8 88 10M6 11l99 9M12 14l96 9M23 12l73 9M27 8l76 11M18 10l82 12M40 10l57 13M60 12l48 10" />
    </g>
  </Drawing>;
}
export function LockBodyDrawing() {
  return <Drawing viewBox="0 0 52 86" className="ssh-lock-drawing">
    <Hatching id="ssh-iron-hatch" />
    <path d="M4 1 51 2 51 84 3 85 1 82 2 4Z" fill="#000" fillOpacity=".88" />
    <path d="M4 1 51 2 51 84 3 85 1 82 2 4Z" fill="url(#ssh-iron-hatch)" />
    <Pencil d="M4 1 51 2 51 84 3 85 1 82 2 4ZM6 6 46 7 47 79 6 80Z" opacity={.8} width={.65} />
    <g fill="#fff" fillOpacity=".58" stroke="#000" strokeWidth=".6">
      <circle cx="12" cy="12" r="3.4" /><circle cx="12" cy="73" r="3.4" />
      <path d="m10 14 4-4m-4 65 4-4" />
    </g>
    <path d="M8 25q14-4 34-1M8 60l13-2m14 13 8-3" stroke="#fff" strokeOpacity=".12" strokeWidth=".5" />
  </Drawing>;
}
export function StrikeDrawing() {
  return <Drawing viewBox="0 0 30 42" className="ssh-lock-drawing">
    <path d="M1 2 28 1 29 41 1 40Z" fill="#000" fillOpacity=".88" />
    <Pencil d="M1 2 28 1 29 41 1 40ZM7 9 23 8 23 32 7 33Z" opacity={.8} />
    <path d="M10 14h9v15h-9Z" fill="#000" />
  </Drawing>;
}
