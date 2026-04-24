import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface ModalProps {
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}

export function Modal({ title, children, footer, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</h3>
          <button className="btn icon ghost" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>
        <div style={{ padding: '18px 20px' }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} footer={
      <>
        <button className="btn ghost" onClick={onCancel}>Cancelar</button>
        <button
          className="btn primary"
          style={danger ? { background: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' } : undefined}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </>
    }>
      <p style={{ margin: 0, color: 'var(--fg-1)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  )
}
