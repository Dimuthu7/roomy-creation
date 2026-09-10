import { Svg, Polygon } from '@react-pdf/renderer'

// The paper documents use ❖ (U+2756) for specification lines and ➢ (U+27A2) for
// option headings. Neither glyph exists in the standard PDF fonts, and embedded-font
// coverage for them is unpredictable — this is the classic "looks right locally,
// renders as □ in production" trap. Drawn as vector shapes, they cannot fail.

export function SpecMarker({ size = 5 }: { size?: number }) {
  const h = size / 2
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={`${h},0 ${size},${h} ${h},${size} 0,${h}`} fill="#000" />
    </Svg>
  )
}

export function OptionMarker({ size = 6 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Polygon points={`0,0 ${size},${size / 2} 0,${size}`} fill="#000" />
    </Svg>
  )
}
