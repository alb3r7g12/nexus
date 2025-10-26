const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let inventoryData = []
let isDataLoaded = false

const calculateStatus = (expiryDate) => {
  const today = new Date()
  const expiry = new Date(expiryDate)

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'expired';
  }

  if (diffDays <= 5) {
    return 'warning';
  }

  return 'ok';
};

const csvFilePath = path.join(__dirname, 'HackMTY2025_ExpirationDateManagement_Dataset_v1q.csv')

fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    const status = calculateStatus(row.Expiry_Date);
    inventoryData.push({ ...row, status });
  })
  .on('end', () => {
    isDataLoaded = true;
    console.log(`CSV cargado y procesado. ${inventoryData.length} productos en memoria.`);
  })
  .on('error', (err) => {
    console.error('Error al leer el CSV:', err.message);
  });

app.get('/api/inventory', (req, res) => {
  if (!isDataLoaded) {
    return res.status(503).json({ error: 'Datos cargándose, intenta de nuevo en unos segundos.' })
  }

  res.json(inventoryData);
});

app.get('/api/lot/:lotNumber', (req, res) => {
  if (!isDataLoaded) {
    return res.status(503).json({ error: 'Datos cargándose, intenta de nuevo en unos segundos.' })
  }

  const { lotNumber } = req.params;
  const products = inventoryData.filter((item) => item.LOT_Number === lotNumber);

  if (products.length > 0) {
    return res.json(products);
  }

  return res.status(404).json({ error: 'Lote no encontrado' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
});
