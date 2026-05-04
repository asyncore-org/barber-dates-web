export function PreviewHeroMock() {
  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ background: 'var(--bg-0)', fontFamily: 'var(--font-display)' }}
    >
      {/* Hero */}
      <div
        className="flex flex-col items-center justify-center px-4 py-8 text-center"
        style={{ background: '#1A1A1A' }}
      >
        <p
          className="text-xs tracking-[0.25em] font-semibold uppercase mb-3"
          style={{ color: 'var(--gold)' }}
        >
          Barcelona · Est. 2019
        </p>
        <h2
          className="text-3xl font-bold leading-none mb-3"
          style={{ color: 'var(--fg-0, #fff)', fontFamily: 'var(--font-display)' }}
        >
          Gio<br />
          <span style={{ color: 'var(--gold)' }}>Barber</span><br />
          Shop
        </h2>
        <p className="text-xs mb-5 max-w-[160px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Barbería premium. Reserva online y acumula puntos.
        </p>
        <div className="flex gap-2">
          <div
            className="rounded-lg px-4 py-2 text-xs font-bold"
            style={{ background: 'var(--gold)', color: '#000' }}
          >
            Reservar
          </div>
          <div
            className="rounded-lg px-4 py-2 text-xs font-semibold border"
            style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)' }}
          >
            Entrar
          </div>
        </div>
      </div>

      {/* Servicios */}
      <div className="px-4 py-5" style={{ background: '#111' }}>
        <p className="text-center text-[10px] tracking-[0.25em] uppercase mb-3" style={{ color: 'var(--gold)' }}>
          Servicios
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'Corte', price: '18€' },
            { name: 'Barba', price: '14€' },
            { name: 'Corte+Barba', price: '28€' },
          ].map(({ name, price }) => (
            <div
              key={name}
              className="flex flex-col items-center text-center rounded-lg p-3 border"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center mb-2 text-[10px] font-bold"
                style={{ background: `color-mix(in srgb, var(--gold) 15%, transparent)`, color: 'var(--gold)' }}
              >
                ✂
              </div>
              <div className="text-[10px] font-semibold mb-0.5" style={{ color: '#fff' }}>{name}</div>
              <div className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{price}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
