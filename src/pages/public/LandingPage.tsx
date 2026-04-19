import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#1a1a1a] text-white">
      <h1 className="text-4xl font-bold tracking-tight">Gio Barber Shop</h1>
      <p className="text-white/50">Reserva tu cita online — próximamente</p>
      <Link
        to="/auth"
        className="rounded-lg bg-[#C8A44E] px-6 py-3 text-sm font-semibold text-black hover:bg-[#b8943e] transition-colors"
      >
        Acceder
      </Link>
    </div>
  )
}
