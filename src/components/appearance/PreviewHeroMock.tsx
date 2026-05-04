const NAV_ITEMS = ['Servicios', 'Horarios', 'Barberos', 'Fidelización', 'Barbería']
const SERVICES = [
  { name: 'Corte de pelo', duration: '30 min', price: '18€' },
  { name: 'Arreglo de barba', duration: '20 min', price: '14€' },
]

export function PreviewHeroMock() {
  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--bg-1)',
        fontFamily: 'var(--font-ui)',
        minHeight: 180,
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: 6,
          background: 'var(--bg-2)',
          width: 88,
          flexShrink: 0,
          borderRight: '1px solid var(--line)',
        }}
      >
        {NAV_ITEMS.map((item, i) => (
          <div
            key={item}
            style={
              i === 0
                ? {
                    padding: '5px 8px',
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 600,
                    color: 'var(--led)',
                    background: `color-mix(in srgb, var(--led) 12%, transparent)`,
                    borderLeft: '2px solid var(--led)',
                  }
                : {
                    padding: '5px 8px',
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 400,
                    color: 'var(--fg-2)',
                  }
            }
          >
            {item}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ fontSize: 8, letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-3)', margin: 0 }}>
          Servicios
        </p>
        {SERVICES.map((s) => (
          <div
            key={s.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderRadius: 6,
              background: 'var(--bg-3)',
              border: '1px solid var(--line)',
            }}
          >
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--fg-0)' }}>{s.name}</div>
              <div style={{ fontSize: 8, color: 'var(--fg-3)' }}>{s.duration}</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gold)' }}>{s.price}</div>
          </div>
        ))}
        <div
          style={{
            width: '100%',
            padding: '5px 0',
            borderRadius: 6,
            textAlign: 'center',
            fontSize: 8,
            fontWeight: 700,
            background: 'var(--led)',
            color: '#fff',
          }}
        >
          + Añadir servicio
        </div>
      </div>
    </div>
  )
}
