import { Helmet } from 'react-helmet-async'

export default function BarberPage() {
  return (
    <>
      <Helmet><title>Barbero · Gio Barber Shop</title></Helmet>
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-2)', fontFamily: 'var(--font-ui)' }}>
        <div style={{ fontSize: 32, marginBottom: '1rem' }}>✂️</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-0)', marginBottom: 8 }}>Panel de barbero</div>
        <div style={{ fontSize: 13 }}>Próximamente — aquí verás tu agenda y citas asignadas.</div>
      </div>
    </>
  )
}
