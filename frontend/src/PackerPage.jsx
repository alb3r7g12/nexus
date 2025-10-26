import { useState, useMemo } from 'react'
import axios from 'axios'
import QrScanner from 'react-qr-scanner'
import classNames from 'classnames'
import { motion, AnimatePresence } from 'framer-motion'
import CountUp from 'react-countup'
import './PackerPage.css'

const STATUS_PRIORITY = { expired: 3, warning: 2, ok: 1 }

const STATUS_SHORT_LABEL = {
  ready: 'Listo',
  scanning: 'Escaneando',
  error: 'Error',
  expired: 'Expirado',
  warning: 'Alerta',
  ok: 'OK',
}

const SCANNER_STATE_LABELS = {
  ready: 'Listo para escanear',
  scanning: 'Procesando lectura...',
  error: 'Revisa la lectura o conexión',
  expired: 'Fuera de especificación. Retira lote',
  warning: 'Atención inmediata requerida',
  ok: 'Dentro de parámetros',
}

const deriveSummary = (items) => {
  if (!items.length) return null
  const lotNumber = items[0].LOT_Number || 'Sin lote'
  let status = 'ok'
  let earliestExpiry = null
  let totalUnits = 0
  const products = []
  const productSet = new Set()
  items.forEach((item) => {
    const normalizedStatus = STATUS_PRIORITY[item.status] ? item.status : 'ok'
    if (STATUS_PRIORITY[normalizedStatus] > STATUS_PRIORITY[status]) {
      status = normalizedStatus
    }
    const quantity = Number(item.Quantity)
    if (!Number.isNaN(quantity)) {
      totalUnits += quantity
    }
    const expiryDate = new Date(item.Expiry_Date)
    if (!Number.isNaN(expiryDate.getTime())) {
      if (!earliestExpiry || expiryDate < earliestExpiry) {
        earliestExpiry = expiryDate
      }
    }
    if (item.Product_Name && !productSet.has(item.Product_Name)) {
      productSet.add(item.Product_Name)
      products.push(item.Product_Name)
    }
  })
  return {
    lotNumber,
    status,
    expiryDate: earliestExpiry,
    totalUnits,
    products,
  }
}

const deriveProductBreakdown = (items) => {
  if (!items.length) return []
  const map = new Map()
  items.forEach((item) => {
    const name = item.Product_Name || 'Producto sin nombre'
    const quantity = Number(item.Quantity)
    const safeQuantity = Number.isNaN(quantity) ? 0 : quantity
    const expiryDate = new Date(item.Expiry_Date)
    const normalizedStatus = STATUS_PRIORITY[item.status] ? item.status : 'ok'
    if (!map.has(name)) {
      map.set(name, {
        name,
        quantity: 0,
        status: normalizedStatus,
        expiryDate: Number.isNaN(expiryDate.getTime()) ? null : expiryDate,
      })
    }
    const entry = map.get(name)
    entry.quantity += safeQuantity
    if (STATUS_PRIORITY[normalizedStatus] > STATUS_PRIORITY[entry.status]) {
      entry.status = normalizedStatus
    }
    if (!Number.isNaN(expiryDate.getTime())) {
      if (!entry.expiryDate || expiryDate < entry.expiryDate) {
        entry.expiryDate = expiryDate
      }
    }
  })
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
}

function PackerPage() {
  const [scannedResults, setScannedResults] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastLotNumber, setLastLotNumber] = useState(null)
  const [scannerKey, setScannerKey] = useState(0)
  const [scannerActive, setScannerActive] = useState(false)

  const summary = useMemo(() => deriveSummary(scannedResults), [scannedResults])
  const productBreakdown = useMemo(() => deriveProductBreakdown(scannedResults), [scannedResults])

  const scannerState = useMemo(() => {
    if (loading) return 'scanning'
    if (error) return 'error'
    if (summary) return summary.status
    return 'ready'
  }, [loading, error, summary])

  const stateLabel = SCANNER_STATE_LABELS[scannerState]
  const displayedLot = summary?.lotNumber || lastLotNumber || 'N/A'

  const pushHistoryEntry = (entry) => {
    setHistory((prev) => {
      const next = [entry, ...prev]
      return next.slice(0, 8)
    })
  }

  const handleScan = async (data) => {
    if (!data || loading || !scannerActive) return
    const text = typeof data.text === 'string' ? data.text.trim() : ''
    if (!text) return
    setLoading(true)
    setError(null)
    setLastLotNumber(text)
    try {
      const response = await axios.get(`http://localhost:3001/api/lot/${encodeURIComponent(text)}`)
      const results = Array.isArray(response.data) ? response.data : []
      setScannedResults(results)
      const nextSummary = deriveSummary(results)
      if (nextSummary) {
        pushHistoryEntry({
          lotNumber: nextSummary.lotNumber,
          status: nextSummary.status,
          quantity: nextSummary.totalUnits,
          timestamp: Date.now(),
        })
      } else {
        pushHistoryEntry({
          lotNumber: text,
          status: 'error',
          quantity: 0,
          timestamp: Date.now(),
        })
      }
    } catch (err) {
      console.error(err)
      const notFound = err && err.response && err.response.status === 404
      const message = notFound ? `Lote "${text}" no encontrado en la base de datos.` : 'Error al consultar el lote. Revisa la conexión al backend.'
      setError(message)
      setScannedResults([])
      pushHistoryEntry({
        lotNumber: text,
        status: 'error',
        quantity: 0,
        timestamp: Date.now(),
      })
    } finally {
      setLoading(false)
      setScannerActive(false)
    }
  }

  const handleScannerError = (scannerError) => {
    console.error(scannerError)
    setError('Error al acceder a la cámara. Verifica permisos.')
  }

  const handleReset = () => {
    setScannedResults([])
    setError(null)
    setLoading(false)
    setLastLotNumber(null)
    setScannerKey((prev) => prev + 1)
    setScannerActive(true)
  }

  const handleClearHistory = () => {
    setHistory([])
  }

  const handleViewDashboard = () => {
    if (!summary) return
    const params = new URLSearchParams({ lot: summary.lotNumber })
    window.open(`/?${params.toString()}`, '_blank')
  }

  const handleReportIssue = () => {
    if (!summary) return
    const subject = encodeURIComponent(`Incidencia lote ${summary.lotNumber}`)
    const expiryText = summary.expiryDate ? summary.expiryDate.toLocaleDateString('es-MX') : 'Sin dato'
    const body = encodeURIComponent(
      `Lote: ${summary.lotNumber}\nEstado: ${STATUS_SHORT_LABEL[summary.status]}\nExpira: ${expiryText}\nUnidades: ${summary.totalUnits}`,
    )
    window.open(`mailto:ops@gategroup.com?subject=${subject}&body=${body}`)
  }

  return (
    <div className="scanner-page">
      <motion.section
        className="scanner-hero"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="scanner-hero__title">Scanner de lote gategroup</h1>
          <p className="scanner-hero__subtitle">
            Escanea el código QR del lote para validar frescura y tomar decisiones en piso de producción.
          </p>
        </div>
        <div className="scanner-hero__status">
          <span className={classNames('status-chip', `status-chip--${scannerState}`)}>{STATUS_SHORT_LABEL[scannerState]}</span>
          <span className="scanner-hero__label">{stateLabel}</span>
          <span className="scanner-hero__lot">Último lote: {displayedLot}</span>
        </div>
      </motion.section>

      <div className="scanner-grid">
        <motion.article
          className="scanner-panel scanner-panel--primary"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
        >
          <header className="scanner-panel__header">
            <div>
              <h2 className="scanner-panel__title">Escanea un código QR</h2>
              <p className="scanner-panel__subtitle">Alinea el código dentro del recuadro luminiscente</p>
            </div>
            <button type="button" className="scanner-action scanner-action--ghost" onClick={handleReset} disabled={loading && !summary && !error}>
              Reiniciar visor
            </button>
          </header>
          <div className="scanner-viewport">
            <div className="scanner-viewport__frame">
              <div className="scanner-viewport__video">
                {scannerActive ? (
                  <>
                    <QrScanner
                      key={scannerKey}
                      delay={300}
                      onError={handleScannerError}
                      onScan={handleScan}
                    />
                    <div className="scanner-viewport__overlay" />
                  </>
                ) : (
                  <div className="scanner-viewport__placeholder">
                    <span>Presiona “Escanear siguiente” o “Reiniciar visor” para activar la cámara.</span>
                  </div>
                )}
              </div>
            </div>
            <ul className="scanner-instructions">
              <li>Activa la cámara con el botón cuando estés listo para leer.</li>
              <li>Asegúrate de que el QR esté iluminado y centrado.</li>
              <li>Mantén el dispositivo a 20 cm y confirma el estado antes de liberar.</li>
            </ul>
          </div>
        </motion.article>

        <motion.article
          className="scanner-panel scanner-panel--detail"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
        >
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                className="scanner-message scanner-message--error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h3>Sin coincidencias</h3>
                <p>{error}</p>
              </motion.div>
            )}
            {!error && summary && (
              <motion.div
                key="summary"
                className="scanner-summary"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div className="scanner-summary__header">
                  <div>
                    <span className="scanner-summary__eyebrow">Lote analizado</span>
                    <h3>{summary.lotNumber}</h3>
                  </div>
                  <span className={classNames('status-chip', `status-chip--${summary.status}`)}>{STATUS_SHORT_LABEL[summary.status]}</span>
                </div>
                <div className="scanner-summary__metrics">
                  <div className="metric-card">
                    <span className="metric-card__label">Unidades</span>
                    <span className="metric-card__value">
                      <CountUp end={summary.totalUnits} duration={0.8} separator="," />
                    </span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-card__label">Productos distintos</span>
                    <span className="metric-card__value">{summary.products.length}</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-card__label">Fecha de expiración</span>
                    <span className="metric-card__value">
                      {summary.expiryDate ? summary.expiryDate.toLocaleDateString('es-MX') : 'Sin dato'}
                    </span>
                  </div>
                </div>
                {productBreakdown.length > 0 && (
                  <div className="scanner-summary__products">
                    {productBreakdown.slice(0, 4).map((product) => (
                      <div key={product.name} className="product-pill">
                        <div>
                          <span className="product-pill__name">{product.name}</span>
                          <span className="product-pill__meta">
                            {product.expiryDate ? `Expira ${product.expiryDate.toLocaleDateString('es-MX')}` : 'Sin fecha registrada'}
                          </span>
                        </div>
                        <div className="product-pill__stats">
                          <span className="product-pill__quantity">
                            <CountUp end={product.quantity} duration={0.6} separator="," />
                          </span>
                          <span className={classNames('status-chip', `status-chip--${product.status}`)}>
                            {STATUS_SHORT_LABEL[product.status]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {!error && !summary && (
              <motion.div
                key="placeholder"
                className="scanner-message"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <h3>Escanea el primer lote para comenzar</h3>
                <p>Los detalles aparecerán aquí cuando detectemos un código válido.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="scanner-actions">
            <button type="button" className="scanner-action scanner-action--primary" onClick={handleReset}>
              Escanear siguiente
            </button>
            <button type="button" className="scanner-action" onClick={handleReportIssue} disabled={!summary}>
              Reportar incidencia
            </button>
            <button type="button" className="scanner-action" onClick={handleViewDashboard} disabled={!summary}>
              Ver en dashboard
            </button>
            <button type="button" className="scanner-action scanner-action--ghost" onClick={handleClearHistory} disabled={history.length === 0}>
              Limpiar historial
            </button>
          </div>
        </motion.article>

        <motion.article
          className="scanner-panel scanner-panel--history"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.4 }}
        >
          <header className="scanner-panel__header">
            <h2 className="scanner-panel__title">Historial reciente</h2>
            <p className="scanner-panel__subtitle">Últimos lotes escaneados en esta estación</p>
          </header>
          <ul className="scanner-history">
            {history.length === 0 && <li className="scanner-history__empty">Aún no hay lecturas registradas.</li>}
            {history.map((entry) => (
              <li key={`${entry.lotNumber}-${entry.timestamp}`} className="history-item">
                <div className="history-item__main">
                  <span className="history-item__lot">{entry.lotNumber}</span>
                  <span className="history-item__meta">
                    {new Date(entry.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="history-item__extra">
                  <span className="history-item__qty">
                    <CountUp end={entry.quantity} duration={0.5} separator="," />
                  </span>
                  <span className={classNames('status-chip', `status-chip--${entry.status}`)}>
                    {STATUS_SHORT_LABEL[entry.status] || STATUS_SHORT_LABEL.error}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </motion.article>
      </div>
    </div>
  )
}

export default PackerPage
