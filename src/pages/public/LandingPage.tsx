import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useShopContext } from '@/context/ShopContext'
import { Icon } from '@/components/ui'

const SERVICES = [
  { name: 'Corte', duration: '30 min', price: '18€', icon: 'scissors' as const },
  { name: 'Barba', duration: '20 min', price: '14€', icon: 'sparkle' as const },
  { name: 'Corte + Barba', duration: '50 min', price: '28€', icon: 'award' as const },
]

const STEPS = [
  { n: '1', title: 'Elige servicio', desc: 'Corte, barba o pack completo. Tú decides.' },
  { n: '2', title: 'Reserva fecha y hora', desc: 'Elige el día y el hueco que mejor te venga.' },
  { n: '3', title: 'Ven y disfruta', desc: 'Preséntate y nosotros hacemos el resto.' },
]

export default function LandingPage() {
  const { name: shopName, phone, address, instagram } = useShopContext()
  return (
    <>
      <Helmet>
        <title>{shopName} — Reserva tu cita online</title>
        <meta name="description" content="Barbería premium en Barcelona. Reserva tu cita online, acumula puntos y disfruta de recompensas exclusivas." />
      </Helmet>

      {/* ── Hero ─────────────────────────────────────── */}
      <section className="min-h-dvh flex flex-col items-center justify-center px-5 py-16 text-center bg-[#1A1A1A]">
        {/* Logo mark */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <Icon name="scissors" size={28} className="text-[#C8A44E]" />
        </div>

        <p className="text-[#C8A44E] text-xs tracking-[0.3em] font-semibold uppercase mb-4">
          Barcelona · Est. 2019
        </p>

        <h1
          className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-none mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Gio<br />
          <span className="text-[#C8A44E]">Barber</span><br />
          Shop
        </h1>

        <p className="text-white/50 text-base md:text-lg max-w-xs md:max-w-sm mb-10 leading-relaxed">
          Barbería premium. Reserva online, acumula puntos y disfruta de recompensas exclusivas.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-sm">
          <Link
            to="/auth"
            className="flex-1 rounded-xl bg-[#C8A44E] px-6 py-4 text-base font-bold text-black hover:bg-[#b8943e] transition-colors text-center"
          >
            Reservar cita
          </Link>
          <Link
            to="/auth"
            className="flex-1 rounded-xl border border-white/20 px-6 py-4 text-base font-semibold text-white/80 hover:bg-white/5 transition-colors text-center"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="mt-16 flex flex-col items-center gap-2 text-white/25 text-xs">
          <Icon name="chevronD" size={18} />
        </div>
      </section>

      {/* ── Servicios ────────────────────────────────── */}
      <section className="bg-[#111] px-5 py-14">
        <p className="text-center text-[#C8A44E] text-xs tracking-[0.3em] font-semibold uppercase mb-2">
          Servicios
        </p>
        <h2
          className="text-center text-2xl md:text-3xl font-bold text-white mb-10"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Lo que hacemos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {SERVICES.map(({ name, duration, price, icon }) => (
            <div
              key={name}
              className="flex flex-col items-center text-center rounded-xl p-6 border border-white/10 bg-white/[0.03]"
            >
              <div className="w-12 h-12 rounded-full bg-[#C8A44E]/10 flex items-center justify-center mb-4">
                <Icon name={icon} size={22} className="text-[#C8A44E]" />
              </div>
              <div
                className="text-lg font-semibold text-white mb-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {name}
              </div>
              <div className="text-white/40 text-sm mb-3">{duration}</div>
              <div
                className="text-2xl font-bold text-[#C8A44E]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {price}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────── */}
      <section className="bg-[#1A1A1A] px-5 py-14">
        <p className="text-center text-[#C8A44E] text-xs tracking-[0.3em] font-semibold uppercase mb-2">
          Proceso
        </p>
        <h2
          className="text-center text-2xl md:text-3xl font-bold text-white mb-10"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ¿Cómo funciona?
        </h2>

        <div className="flex flex-col sm:flex-row gap-8 max-w-2xl mx-auto">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="flex sm:flex-col items-start sm:items-center gap-4 sm:text-center flex-1">
              <div
                className="w-12 h-12 shrink-0 rounded-full border-2 border-[#C8A44E] flex items-center justify-center text-[#C8A44E] text-xl font-bold"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {n}
              </div>
              <div>
                <div className="text-white font-semibold text-base mb-1">{title}</div>
                <div className="text-white/45 text-sm leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Info + CTA ───────────────────────────────── */}
      <section className="bg-[#111] px-5 py-14">
        <div className="max-w-sm mx-auto text-center">
          <p className="text-[#C8A44E] text-xs tracking-[0.3em] font-semibold uppercase mb-6">
            Encuéntranos
          </p>

          <div className="flex flex-col gap-4 mb-10">
            {address && (
              <div className="flex items-center justify-center gap-3 text-white/55 text-sm">
                <Icon name="mapPin" size={16} className="text-[#C8A44E] shrink-0" />
                <span>{address}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center justify-center gap-3 text-white/55 text-sm">
                <Icon name="phone" size={16} className="text-[#C8A44E] shrink-0" />
                <span>{phone}</span>
              </div>
            )}
            {instagram && (
              <div className="flex items-center justify-center gap-3 text-white/55 text-sm">
                <Icon name="sparkle" size={16} className="text-[#C8A44E] shrink-0" />
                <span>{instagram}</span>
              </div>
            )}
          </div>

          <Link
            to="/auth"
            className="block w-full rounded-xl bg-[#C8A44E] px-6 py-4 text-base font-bold text-black hover:bg-[#b8943e] transition-colors"
          >
            Reservar mi cita ahora
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="bg-[#0d0d0d] px-5 py-6 text-center">
        <p className="text-white/25 text-xs">
          © {new Date().getFullYear()} {shopName} · Barcelona
        </p>
      </footer>
    </>
  )
}
