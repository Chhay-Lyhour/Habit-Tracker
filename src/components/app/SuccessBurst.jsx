/**
 * A small spark burst fired when a habit is completed. Purely decorative, so
 * it is hidden from assistive tech; the global prefers-reduced-motion rule in
 * index.css collapses the animation for anyone who asks for less movement.
 *
 * `burstKey` should change on every completion — React remounts the sparks and
 * the animation replays.
 */
const SPARKS = [
  { x: '-26px', y: '-22px' },
  { x: '0px', y: '-32px' },
  { x: '26px', y: '-22px' },
  { x: '-30px', y: '6px' },
  { x: '30px', y: '6px' },
  { x: '-16px', y: '26px' },
  { x: '16px', y: '26px' },
]

export function SuccessBurst({ burstKey }) {
  if (!burstKey) return null

  return (
    <span
      key={burstKey}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      {SPARKS.map((spark, i) => (
        <span
          key={i}
          className="animate-habit-spark absolute size-2 rounded-full bg-grass-bright"
          style={{
            '--spark-x': spark.x,
            '--spark-y': spark.y,
            animationDelay: `${i * 18}ms`,
          }}
        />
      ))}
    </span>
  )
}
