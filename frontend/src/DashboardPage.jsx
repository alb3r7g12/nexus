import { useState, useEffect, useMemo, useCallback } from 'react'
import classNames from 'classnames'
import axios from 'axios'
import CountUp from 'react-countup'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import './DashboardPage.css'

const STATUS_CONFIG = {
  expired: {
    label: 'Lotes Expirados',
    shortLabel: 'Expirados',
    description: 'Requieren retiro inmediato',
    kpiClassName: 'kpi-card--expired',
    pillClassName: 'status-pill--expired',
    color: 'var(--status-expired)',
  },
  warning: {
    label: 'Lotes en Alerta (≤5 días)',
    shortLabel: 'Alerta',
    description: 'Planificar intervención pronto',
    kpiClassName: 'kpi-card--warning',
    pillClassName: 'status-pill--warning',
    color: 'var(--status-warning)',
  },
  ok: {
    label: 'Lotes Frescos (OK)',
    shortLabel: 'Frescos',
    description: 'Dentro del rango óptimo',
    kpiClassName: 'kpi-card--ok',
    pillClassName: 'status-pill--ok',
    color: 'var(--status-ok)',
  },
}

const STATUS_PRIORITY = {
  expired: 1,
  warning: 2,
  ok: 3,
}

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

const chartTooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.92)',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.4)',
  color: 'var(--color-text-primary)',
  padding: '12px 16px',
  boxShadow: 'var(--shadow-intense)',
}

function DashboardPage() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true)
      const response = await axios.get('http://localhost:3001/api/inventory')
      setInventory(response.data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      console.error(err)
      setError('Error al cargar el inventario. ¿Está el backend corriendo?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const statusCounts = useMemo(
    () =>
      Object.keys(STATUS_CONFIG).reduce(
        (acc, key) => {
          acc[key] = inventory.filter((item) => item.status === key).length
          return acc
        },
        { expired: 0, warning: 0, ok: 0 },
      ),
    [inventory],
  )

  const totalLots = inventory.length
  const totalUnits = useMemo(
    () =>
      inventory.reduce((accumulator, item) => {
        const quantity = Number(item.Quantity)
        return accumulator + (Number.isNaN(quantity) ? 0 : quantity)
      }, 0),
    [inventory],
  )

  const freshnessTimeline = useMemo(() => {
    const now = new Date()
    const dayMs = 1000 * 60 * 60 * 24
    const buckets = [
      { label: 'Expirados', expired: 0, warning: 0, ok: 0 },
      { label: '0-7 días', expired: 0, warning: 0, ok: 0 },
      { label: '8-14 días', expired: 0, warning: 0, ok: 0 },
      { label: '15-30 días', expired: 0, warning: 0, ok: 0 },
      { label: '30+ días', expired: 0, warning: 0, ok: 0 },
    ]

    inventory.forEach((item) => {
      const expiry = new Date(item.Expiry_Date)
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / dayMs)
      let bucketIndex = 0

      if (diffDays < 0) bucketIndex = 0
      else if (diffDays <= 7) bucketIndex = 1
      else if (diffDays <= 14) bucketIndex = 2
      else if (diffDays <= 30) bucketIndex = 3
      else bucketIndex = 4

      const statusKey = STATUS_CONFIG[item.status] ? item.status : 'ok'
      buckets[bucketIndex][statusKey] += 1
    })

    return buckets
  }, [inventory])

  const statusBreakdown = useMemo(
    () =>
      Object.entries(STATUS_CONFIG).map(([key, config]) => ({
        name: config.shortLabel,
        value: statusCounts[key],
        fill: config.color,
      })),
    [statusCounts],
  )

  const topProducts = useMemo(() => {
    const aggregate = new Map()

    inventory.forEach((item) => {
      const productName = item.Product_Name || 'Producto sin nombre'
      const quantity = Number(item.Quantity)
      const safeQuantity = Number.isNaN(quantity) ? 0 : quantity

      if (!aggregate.has(productName)) {
        aggregate.set(productName, { total: 0, expired: 0, warning: 0, ok: 0 })
      }

      const stats = aggregate.get(productName)
      stats.total += safeQuantity

      if (STATUS_CONFIG[item.status]) {
        stats[item.status] += safeQuantity
      } else {
        stats.ok += safeQuantity
      }
    })

    return Array.from(aggregate.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([name, stats]) => ({ name, ...stats }))
  }, [inventory])

  const criticalLots = useMemo(() => {
    const urgentLots = inventory.filter((item) => item.status !== 'ok')

    return urgentLots
      .sort((a, b) => new Date(a.Expiry_Date) - new Date(b.Expiry_Date))
      .slice(0, 4)
  }, [inventory])

  const sortedInventory = useMemo(() => {
    const copy = [...inventory]
    copy.sort((a, b) => {
      const statusDiff = (STATUS_PRIORITY[a.status] || 3) - (STATUS_PRIORITY[b.status] || 3)
      if (statusDiff !== 0) return statusDiff
      return new Date(a.Expiry_Date) - new Date(b.Expiry_Date)
    })
    return copy
  }, [inventory])

  if (loading) {
    return (
      <div className="dashboard dashboard--loading">
        <motion.div
          className="loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
        >
          Sincronizando inventario...
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard dashboard--error">
        <motion.div
          className="error-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2>⚠️ {error}</h2>
          <button type="button" className="refresh-button" onClick={fetchInventory}>
            Reintentar carga
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <motion.header className="dashboard__header" variants={fadeInUp} initial="hidden" animate="visible">
        <div>
          <h1 className="dashboard__title">Control de frescura en vivo</h1>
          <p className="dashboard__subtitle">
            Seguimiento integral del inventario gategroup. Prioriza retiros, planifica reposiciones y anticipa expiraciones.
          </p>
        </div>
        <div className="dashboard__meta">
          <span>Total de lotes: {totalLots}</span>
          <span>Unidades totales: {totalUnits.toLocaleString('es-MX')}</span>
          {lastUpdated && <span>Actualizado: {lastUpdated.toLocaleString('es-MX')}</span>}
          <button type="button" className="refresh-button" onClick={fetchInventory}>
            Refrescar datos
          </button>
        </div>
      </motion.header>

      <motion.section
        className="kpi-grid"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.08 }}
      >
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <motion.article
            key={key}
            className={classNames('kpi-card', config.kpiClassName)}
            whileHover={{ translateY: -6 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <span className="kpi-card__label">{config.label}</span>
            <span className="kpi-card__value">
              <CountUp end={statusCounts[key]} duration={0.9} separator="," />
            </span>
            <span className="kpi-card__description">{config.description}</span>
          </motion.article>
        ))}
      </motion.section>

      <motion.section
        className="dashboard-grid"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.12 }}
      >
        <article className="panel panel--tall">
          <header className="panel__header">
            <h2 className="panel__title">Horizonte de expiración</h2>
            <p className="panel__subtitle">Cómo evolucionan los lotes por ventana de días restante</p>
          </header>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={freshnessTimeline} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExpired" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--status-expired)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--status-expired)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--status-warning)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--status-warning)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorOk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--status-ok)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--status-ok)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="label" stroke="var(--color-text-secondary)" tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-secondary)" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="expired" stroke="var(--status-expired)" fill="url(#colorExpired)" />
                <Area type="monotone" dataKey="warning" stroke="var(--status-warning)" fill="url(#colorWarning)" />
                <Area type="monotone" dataKey="ok" stroke="var(--status-ok)" fill="url(#colorOk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <header className="panel__header">
            <h2 className="panel__title">Distribución por estado</h2>
            <p className="panel__subtitle">Proporción de lotes por semáforo de frescura</p>
          </header>
          <div className="chart-wrapper chart-wrapper--small">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={4}
                  blendStroke
                >
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${value} lotes`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="status-legend">
            {statusBreakdown.map((entry) => (
              <li key={entry.name}>
                <span className="status-legend__dot" style={{ background: entry.fill }} />
                {entry.name} — {entry.value}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <header className="panel__header">
            <h2 className="panel__title">Top productos por unidades</h2>
            <p className="panel__subtitle">Visibilidad para logística y planeación de pedidos</p>
          </header>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" stroke="var(--color-text-secondary)" hide />
                <YAxis type="category" dataKey="name" stroke="var(--color-text-secondary)" width={160} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value, key) => {
                    const statusLabel = STATUS_CONFIG[key]?.shortLabel || key
                    return [`${value.toLocaleString('es-MX')} unidades`, statusLabel]
                  }}
                />
                <Bar dataKey="expired" stackId="a" fill="var(--status-expired)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="warning" stackId="a" fill="var(--status-warning)" radius={[0, 6, 6, 0]} />
                <Bar dataKey="ok" stackId="a" fill="var(--status-ok)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <header className="panel__header">
            <h2 className="panel__title">Alertas críticas</h2>
            <p className="panel__subtitle">Lotes que requieren atención inmediata</p>
          </header>
          <ul className="critical-list">
            {criticalLots.length === 0 && <li className="critical-list__empty">No hay alertas activas 🎉</li>}
            {criticalLots.map((lot) => (
              <li key={`${lot.Product_ID}-${lot.LOT_Number}`} className="critical-item">
                <div>
                  <span className="critical-item__label">{lot.Product_Name}</span>
                  <span className="critical-item__meta">Lote {lot.LOT_Number}</span>
                </div>
                <div className="critical-item__badges">
                  <span className={classNames('status-pill', STATUS_CONFIG[lot.status]?.pillClassName)}>
                    {STATUS_CONFIG[lot.status]?.shortLabel || lot.status}
                  </span>
                  <span className="status-pill status-pill--date">Expira {new Date(lot.Expiry_Date).toLocaleDateString('es-MX')}</span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </motion.section>

      <motion.section
        className="panel panel--wide"
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.16 }}
      >
        <header className="panel__header">
          <h2 className="panel__title">Detalle completo del inventario</h2>
          <p className="panel__subtitle">Ordenado por urgencia y fecha de expiración</p>
        </header>

        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Lote</th>
                <th>Fecha de expiración</th>
                <th>Cantidad</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {sortedInventory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="inventory-table__empty">
                    No se encontró inventario.
                  </td>
                </tr>
              ) : (
                sortedInventory.map((item) => (
                  <tr key={`${item.Product_ID}-${item.LOT_Number}`}>
                    <td>{item.Product_Name}</td>
                    <td>{item.LOT_Number}</td>
                    <td>{new Date(item.Expiry_Date).toLocaleDateString('es-MX')}</td>
                    <td>{item.Quantity}</td>
                    <td className="inventory-table__status">
                      <span className={classNames('status-pill', STATUS_CONFIG[item.status]?.pillClassName)}>
                        {STATUS_CONFIG[item.status]?.shortLabel || item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  )
}

export default DashboardPage
