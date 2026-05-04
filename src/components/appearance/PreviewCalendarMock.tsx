const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DATES = [5, 6, 7, 8, 9, 10, 11]
const SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30']
const BUSY = new Set(['10:30', '11:30'])
const SELECTED = '11:00'

export function PreviewCalendarMock() {
  return (
    <div
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--bg-1)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* Section label */}
      <div style={{ padding: '10px 12px 4px' }}>
        <p style={{ margin: 0, fontSize: 8, letterSpacing: '0.2em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)' }}>
          Seleccionar fecha
        </p>
      </div>

      {/* Day strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: '4px 12px 8px' }}>
        {DAYS.map((d, i) => (
          <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 8, color: 'var(--fg-3)' }}>{d}</span>
            <div
              style={
                i === 2
                  ? { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: 'var(--led)', color: '#fff' }
                  : { width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--fg-1)' }
              }
            >
              {DATES[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Hour section */}
      <div style={{ padding: '8px 12px 6px', borderTop: '1px solid var(--line)' }}>
        <p style={{ margin: '0 0 6px', fontSize: 8, letterSpacing: '0.2em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)' }}>
          Hora — miércoles 7
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {SLOTS.map((slot) => (
            <div
              key={slot}
              style={
                BUSY.has(slot)
                  ? { padding: '4px 0', borderRadius: 5, textAlign: 'center', fontSize: 8, fontWeight: 500, border: '1px solid var(--line)', color: 'var(--fg-3)', textDecoration: 'line-through' }
                  : slot === SELECTED
                  ? { padding: '4px 0', borderRadius: 5, textAlign: 'center', fontSize: 8, fontWeight: 700, border: '1px solid var(--led)', background: 'var(--led)', color: '#fff' }
                  : { padding: '4px 0', borderRadius: 5, textAlign: 'center', fontSize: 8, fontWeight: 500, border: '1px solid var(--line)', color: 'var(--fg-1)' }
              }
            >
              {slot}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '6px 12px 10px' }}>
        <div
          style={{
            width: '100%',
            padding: '7px 0',
            borderRadius: 7,
            textAlign: 'center',
            fontSize: 9,
            fontWeight: 700,
            background: 'var(--led)',
            color: '#fff',
          }}
        >
          Confirmar reserva
        </div>
      </div>
    </div>
  )
}
