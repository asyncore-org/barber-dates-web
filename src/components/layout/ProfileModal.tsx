import { useState } from 'react'
import { Modal } from '@/components/ui'
import { useUpdateProfile } from '@/hooks'
import type { User } from '@/domain/user'

interface Props {
  user: User
  onClose: () => void
}

export function ProfileModal({ user, onClose }: Props) {
  const [fullName, setFullName] = useState(user.fullName)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const updateProfile = useUpdateProfile()

  const handleSave = () => {
    setError(null)
    setSuccess(false)
    updateProfile.mutate(
      { id: user.id, data: { fullName: fullName.trim(), phone: phone.trim() || undefined } },
      {
        onSuccess: () => setSuccess(true),
        onError: () => setError('No se pudo guardar. Revisa tu conexión.'),
      },
    )
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 6,
    padding: '0.5rem 0.625rem', color: 'var(--fg-0)',
    fontFamily: 'var(--font-ui)', fontSize: 13, outline: 'none',
  }

  return (
    <Modal
      title="Mis datos"
      onClose={onClose}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          <button
            className="btn primary"
            onClick={handleSave}
            disabled={updateProfile.isPending || !fullName.trim()}
          >
            {updateProfile.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>Nombre</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>Teléfono</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', display: 'block', marginBottom: 4 }}>Email</label>
          <input type="email" value={user.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
        </div>
        {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
        {success && <p style={{ margin: 0, fontSize: 12, color: 'var(--ok)' }}>Datos guardados correctamente.</p>}
      </div>
    </Modal>
  )
}
