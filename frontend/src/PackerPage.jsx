import { useState } from 'react'
import axios from 'axios'
import QrScanner from 'react-qr-scanner'

const styles = {
  container: {
    width: '100vw',
    height: 'calc(100vh - 62px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    color: 'white',
    padding: '20px',
    boxSizing: 'border-box',
  },
  scannerPreview: {
    width: '100%',
    maxWidth: '400px',
    height: '300px',
    border: '4px solid white',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  header: {
    fontSize: '1.5rem',
    marginBottom: '20px',
  },
  resultPageContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    backgroundColor: '#f4f4f4',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  resultBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    borderRadius: '8px',
    color: '#333',
  },
  resultOk: {
    backgroundColor: '#5cb85c',
    color: 'white',
  },
  resultWarning: {
    backgroundColor: '#f0ad4e',
    color: 'white',
  },
  resultExpired: {
    backgroundColor: '#d9534f',
    color: 'white',
  },
  resultError: {
    backgroundColor: '#d9534f',
    color: 'white',
  },
  resultStatus: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
  },
  resultDetails: {
    fontSize: '1rem',
    lineHeight: '1.6',
    textAlign: 'left',
  },
  resetButton: {
    padding: '20px 40px',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginTop: '40px',
    cursor: 'pointer',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#333',
    color: 'white',
  },
}

function PackerPage() {
  const [scannedResults, setScannedResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleScan = async (data) => {
    if (data && !loading) {
      setLoading(true)
      setError(null)
      const lotNumber = data.text

      console.log('Lote escaneado:', lotNumber)

      try {
        const response = await axios.get(`http://localhost:3001/api/lot/${lotNumber}`)
        setScannedResults(response.data)
      } catch (err) {
        console.error(err)
        setError(`Lote "${lotNumber}" no encontrado en la base de datos.`)
        setScannedResults([])
      } finally {
        setLoading(false)
      }
    }
  }

  const handleError = (err) => {
    console.error(err)
    setError('Error al acceder a la cámara. ¿Diste permisos?')
  }

  const resetScanner = () => {
    setScannedResults([])
    setError(null)
    setLoading(false)
  }

  if (scannedResults.length > 0 || error) {
    return (
      <div style={{ ...styles.container, ...styles.resultPageContainer }}>
        {error && (
          <div style={{ ...styles.resultBox, ...styles.resultError }}>
            <h2 style={styles.resultStatus}>🛑 ERROR</h2>
            <p>{error}</p>
          </div>
        )}

        {scannedResults.length > 0 && (
          <div style={styles.resultsList}>
            {scannedResults.map((result, index) => (
              <div
                key={index}
                style={{
                  ...styles.resultBox,
                  ...(result.status === 'ok'
                    ? styles.resultOk
                    : result.status === 'warning'
                      ? styles.resultWarning
                      : styles.resultExpired),
                }}
              >
                <h2 style={styles.resultStatus}>
                  {result.status === 'ok'
                    ? '✅ OK'
                    : result.status === 'warning'
                      ? '⚠️ ALERTA'
                      : '🛑 EXPIRADO'}
                </h2>
                <div style={styles.resultDetails}>
                  <strong>Producto:</strong> {result.Product_Name}
                  <br />
                  <strong>Lote:</strong> {result.LOT_Number}
                  <br />
                  <strong>Expira:</strong> {result.Expiry_Date}
                  <br />
                  <strong>ID Producto:</strong> {result.Product_ID}
                  <br />
                  <strong>Cantidad en Lote:</strong> {result.Quantity}
                </div>
              </div>
            ))}
          </div>
        )}

        <button style={styles.resetButton} onClick={resetScanner}>
          Escanear Siguiente
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Escanee el QR del LOTE</h1>
      <div style={styles.scannerPreview}>
        <QrScanner delay={300} onError={handleError} onScan={handleScan} style={{ width: '100%' }} />
      </div>
      {loading && <h2>Procesando...</h2>}
    </div>
  )
}

export default PackerPage
