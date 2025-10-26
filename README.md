# Nexus – Freshness Intelligence MVP

Proyecto presentado en HackMTY que combina un backend Express y un frontend React para monitorear en tiempo real la frescura de productos alimenticios en operaciones críticas de gategroup.

## Tabla de contenidos
1. [Arquitectura](#arquitectura)
2. [Tecnologías clave](#tecnologías-clave)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación](#instalación)
5. [Scripts disponibles](#scripts-disponibles)
6. [Uso](#uso)
7. [Estructura del proyecto](#estructura-del-proyecto)
8. [Temas y estilo](#temas-y-estilo)
9. [Notas y próximos pasos](#notas-y-próximos-pasos)

## Arquitectura
- **Backend (Express)**: Carga un dataset CSV con inventario y calcula automáticamente el estado de frescura (fresco, alerta, expirado) según fecha de caducidad. Expone endpoints REST para inventario general y detalle por número de lote.
- **Frontend (React + Vite)**: Dashboard para supervisores con KPIs, gráficas y alertas críticas; módulo de escaneo para empacadores con cámara QR, historial y acciones rápidas.

Ambos proyectos se ejecutan de forma independiente (`backend/` y `frontend/`), comunicándose vía HTTP.

## Tecnologías clave
- **Frontend**: React 18, Vite, React Router, Recharts, Framer Motion, React CountUp, react-qr-scanner, Axios, CSS moderno con theme "dark neon".
- **Backend**: Node.js, Express 5, csv-parser, CORS.
- **Herramientas**: npm, ES Modules, GitHub Actions (pendiente), diseño responsive.

## Requisitos previos
1. Node.js >= 18
2. npm >= 9
3. Cámara disponible (para pruebas del lector QR)
4. Dataset `HackMTY2025_ExpirationDateManagement_Dataset_v1q.csv` presente en `backend/`

## Instalación
```bash
# Clonar el repositorio
git clone https://github.com/alb3r7g12/nexus.git
cd nexus

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

## Scripts disponibles
### Backend (`backend/`)
- `npm start` *(si se añade script)*: iniciar servidor Express en `http://localhost:3001`.

### Frontend (`frontend/`)
- `npm run dev`: inicia Vite en modo desarrollo (`http://localhost:5173`).
- `npm run build`: genera build de producción.
- `npm run preview`: sirve el build generado.

> **Nota:** actualmente el backend no tiene script `start`. Puedes ejecutar `node index.js` desde la carpeta `backend/`.

## Uso
1. Levanta el backend: `node index.js` desde `backend/`.
2. Levanta el frontend: `npm run dev` desde `frontend/` y abre `http://localhost:5173`.
3. Navega entre:
   - **Dashboard (Supervisor)**: Resumen de lotes por estado, gráficas, listado de items críticos y actualización en tiempo real.
   - **Scanner (Empacador)**: Activa la cámara con “Escanear siguiente”, apunta al QR del lote para consultar detalles, historial y acciones (reportar incidencia, abrir dashboard filtrado, etc.).

## Estructura del proyecto
```
.
├── backend
│   ├── index.js
│   └── package.json
├── frontend
│   ├── src
│   │   ├── App.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── DashboardPage.css
│   │   ├── PackerPage.jsx
│   │   ├── PackerPage.css
│   │   └── index.css
│   └── package.json
└── README.md
```

## Temas y estilo
- Tema oscuro con acentos neón (gradientes, glassmorphism, sombras suaves).
- Animaciones suaves en gráficas, KPIs y scanner usando Framer Motion.
- Componentes de estado con chips de color para expirar/alerta/ok.

