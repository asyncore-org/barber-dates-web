const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DATES = [5, 6, 7, 8, 9, 10, 11]
const SLOTS = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30']
const BUSY = new Set(['10:30', '11:30'])

export function PreviewCalendarMock() {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: 'var(--bg-1, #1a1a1a)', fontFamily: 'var(--font-sans, sans-serif)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--line, rgba(255,255,255,0.1))' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--fg-0, #fff)' }}>
          Reservar cita
        </span>
        <span className="text-[10px]" style={{ color: 'var(--fg-3, rgba(255,255,255,0.4))' }}>
          Mayo 2026
        </span>
      </div>

      {/* Day strip */}
      <div className="grid grid-cols-7 gap-1 px-3 py-3">
        {DAYS.map((d, i) => (
          <div key={d} className="flex flex-col items-center gap-1">
            <span className="text-[9px]" style={{ color: 'var(--fg-3, rgba(255,255,255,0.4))' }}>{d}</span>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
              style={
                i === 2
                  ? { background: 'var(--led)', color: '#fff' }
                  : { color: 'var(--fg-1, rgba(255,255,255,0.8))' }
              }
            >
              {DATES[i]}
            </div>
          </div>
        ))}
      </div>

      {/* Slots */}
      <div
        className="px-3 pb-3 border-t"
        style={{ borderColor: 'var(--line, rgba(255,255,255,0.1))' }}
      >
        <p
          className="text-[9px] tracking-widest uppercase py-2"
          style={{ color: 'var(--fg-3, rgba(255,255,255,0.4))' }}
        >
          Horas disponibles
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {SLOTS.map((slot) => (
            <div
              key={slot}
              className="rounded-lg py-1.5 text-center text-[10px] font-medium border"
              style={
                BUSY.has(slot)
                  ? {
                      borderColor: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.02)',
                      textDecoration: 'line-through',
                    }
                  : slot === '12:00'
                  ? {
                      borderColor: 'var(--led)',
                      color: 'var(--led)',
                      background: `color-mix(in srgb, var(--led) 10%, transparent)`,
                    }
                  : {
                      borderColor: 'var(--line, rgba(255,255,255,0.1))',
                      color: 'var(--fg-1, rgba(255,255,255,0.8))',
                    }
              }
            >
              {slot}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-3 pb-3">
        <div
          className="w-full rounded-lg py-2 text-center text-[11px] font-bold"
          style={{ background: 'var(--led)', color: '#fff' }}
        >
          Confirmar reserva
        </div>
      </div>
    </div>
  )
}
