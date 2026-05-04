export function PreviewAppointmentsMock() {
  return (
    <div style={{ background: 'var(--bg-0)', minHeight: 240, fontFamily: 'var(--font-ui, sans-serif)', display: 'flex', flexDirection: 'column' }}>
      {/* TopBar */}
      <div style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--line)', padding: '0 12px', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-1)', fontFamily: 'var(--font-display, serif)', letterSpacing: '0.06em' }}>GIO BARBER</span>
        <span style={{ fontSize: 8, color: 'var(--fg-3)' }}>●  ○</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 8 }}>

        {/* Left — appointments list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Next appointment */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px' }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--fg-3)', marginBottom: 4 }}>PRÓXIMA CITA</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--fg-1)' }}>Corte clásico</div>
            <div style={{ fontSize: 7, color: 'var(--fg-3)', marginTop: 1 }}>lun 12 may · 11:00</div>
            <div style={{ marginTop: 4, display: 'inline-block', background: 'color-mix(in srgb, var(--led) 15%, transparent)', color: 'var(--led)', fontSize: 7, padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>Confirmada</div>
          </div>

          {/* History */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', flex: 1 }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', color: 'var(--fg-3)', marginBottom: 4 }}>HISTORIAL</div>
            {[['Corte + barba', 'abr 28'], ['Fade', 'abr 10']].map(([label, date]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 7, color: 'var(--fg-2)' }}>{label}</span>
                <span style={{ fontSize: 7, color: 'var(--fg-3)' }}>{date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — loyalty card */}
        <div
          data-theme="dark"
          style={{
            background: 'linear-gradient(135deg, #0d0d10 0%, #1a1a20 50%, #0d0d10 100%)',
            border: '1px solid color-mix(in srgb, var(--card-accent) 30%, transparent)',
            borderRadius: 8,
            padding: '8px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient glow */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--card-accent) 8%, transparent) 0%, transparent 60%)', pointerEvents: 'none' }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 7, letterSpacing: '0.15em', color: 'var(--card-accent)', fontWeight: 700 }}>GIO BLACK CARD</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                42 <span style={{ fontSize: 8, color: 'var(--card-accent)' }}>pts</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 7, color: 'color-mix(in srgb, var(--card-accent) 50%, transparent)' }}>MIEMBRO</div>
              <div style={{ fontSize: 7, color: 'var(--card-accent)', letterSpacing: '0.1em' }}>A4F2</div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 5 }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '42%', background: `linear-gradient(90deg, var(--brick), var(--card-accent))`, borderRadius: 4, boxShadow: '0 0 6px color-mix(in srgb, var(--card-accent) 55%, transparent)' }} />
          </div>

          {/* Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>0</span>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>100 pts</span>
          </div>

          {/* Next reward */}
          <div style={{ background: 'color-mix(in srgb, var(--card-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--card-accent) 18%, transparent)', borderRadius: 5, padding: '3px 6px' }}>
            <span style={{ fontSize: 7, color: 'var(--card-accent)' }}>★ <strong>58 pts</strong> para Cerveza gratis</span>
          </div>
        </div>
      </div>
    </div>
  )
}
