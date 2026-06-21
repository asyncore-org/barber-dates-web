import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'

interface Props {
  onScan: (memberCode: string) => void
  onClose: () => void
}

export function QRScannerModal({ onScan, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef    = useRef<number>(0)
  const [error, setError]     = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  useEffect(() => {
    let active = true
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => setError('No se pudo acceder a la cámara. Comprueba los permisos.'))
    return () => { active = false; stopStream() }
  }, [stopStream])

  const tickRef = useRef<() => void>(() => {})

  const tick = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !scanning) return
    if (video.readyState < 2) { rafRef.current = requestAnimationFrame(tickRef.current); return }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (result?.data) {
      // Accept both formats: full URI or raw member code
      const match = result.data.match(/^GIO-BARBER:\/\/member\/(.+)$/)
      const code  = match ? match[1] : result.data.trim().toUpperCase()
      if (code.length >= 4) {
        setScanning(false)
        stopStream()
        onScan(code)
        return
      }
    }
    rafRef.current = requestAnimationFrame(tickRef.current)
  }, [scanning, stopStream, onScan])

  useEffect(() => { tickRef.current = tick }, [tick])

  useEffect(() => {
    if (!error && scanning) {
      rafRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(rafRef.current)
    }
  }, [error, scanning, tick])

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-2)', borderRadius: 16, width: '100%', maxWidth: 380, border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--fg-0)', letterSpacing: '0.04em' }}>Escanear tarjeta</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', marginTop: 2 }}>Apunta la cámara al código QR del cliente</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', overflow: 'hidden' }}>
          {error ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1.5rem' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <div style={{ fontSize: 13, color: 'var(--fg-2)', fontFamily: 'var(--font-ui)', textAlign: 'center' }}>{error}</div>
            </div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 180, height: 180, position: 'relative' }}>
                  {([
                    { top: 0,    left: 0,  showTop: true,    showLeft: true,  radius: '4px 0 0 0' },
                    { top: 0,    right: 0, showTop: true,    showRight: true, radius: '0 4px 0 0' },
                    { bottom: 0, left: 0,  showBottom: true, showLeft: true,  radius: '0 0 0 4px' },
                    { bottom: 0, right: 0, showBottom: true, showRight: true, radius: '0 0 4px 0' },
                  ] as Array<{ top?: number; bottom?: number; left?: number; right?: number; showTop?: boolean; showBottom?: boolean; showLeft?: boolean; showRight?: boolean; radius?: string }>).map((corner, i) => (
                    <div key={i} style={{
                      position: 'absolute', width: 24, height: 24,
                      top: corner.top, bottom: corner.bottom, left: corner.left, right: corner.right,
                      borderTop:    corner.showTop    ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                      borderBottom: corner.showBottom ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                      borderLeft:   corner.showLeft   ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                      borderRight:  corner.showRight  ? '2.5px solid rgba(255,255,255,0.9)' : undefined,
                      borderRadius: corner.radius,
                    }} />
                  ))}
                  <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4 }} />
                </div>
              </div>
            </>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ padding: '0.875rem 1.25rem' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '0.7rem', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--fg-1)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
