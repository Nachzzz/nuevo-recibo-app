const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const distPath = path.join(__dirname, '../dist')
const publicPath = app.isPackaged ? distPath : path.join(distPath, '../public')
const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

let win: any = null

function createWindow() {
  win = new BrowserWindow({
    title: 'Generador de Recibos Memory',
    icon: path.join(publicPath, 'icon.ico'),
    width: 1280,
    height: 850,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev
    },
  })

  win.setMenu(null)

  if (isDev) {
    win.webContents.openDevTools()
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(distPath, 'index.html'))
  }
}

function leerDbfNativo(rutaArchivo: string): any[] {
  const buffer = fs.readFileSync(rutaArchivo)
  if (buffer.length < 32) return []

  const recordCount = buffer.readInt32LE(4)
  const headerLength = buffer.readInt16LE(8)
  const recordLength = buffer.readInt16LE(10)

  const fields: any[] = []
  let currentOffset = 1
  let pos = 32

  while (pos < headerLength && buffer[pos] !== 0x0d) {
    let nameRaw = buffer.toString('latin1', pos, pos + 11)
    const nullIdx = nameRaw.indexOf('\0')
    if (nullIdx !== -1) nameRaw = nameRaw.substring(0, nullIdx)
    const name = nameRaw.trim()

    const type = String.fromCharCode(buffer[pos + 11])
    const length = buffer[pos + 16]

    if (name && length > 0) {
      fields.push({ name, type, length, offset: currentOffset })
    }

    currentOffset += length
    pos += 32
  }

  const records: any[] = []
  for (let i = 0; i < recordCount; i++) {
    const recordStart = headerLength + i * recordLength
    if (recordStart + recordLength > buffer.length) break

    if (buffer[recordStart] === 0x2a) continue

    const record: Record<string, any> = {}
    for (const f of fields) {
      const fStart = recordStart + f.offset
      if (fStart + f.length > buffer.length) continue

      const fBytes = buffer.subarray(fStart, fStart + f.length)
      const rawStr = fBytes.toString('latin1').trim()

      switch (f.type) {
        case 'N':
        case 'F':
          record[f.name] = rawStr === '' ? null : Number(rawStr)
          break
        case 'I':
          record[f.name] = fBytes.length >= 4 ? fBytes.readInt32LE(0) : null
          break
        case 'B':
          record[f.name] = fBytes.length >= 8 ? fBytes.readDoubleLE(0) : null
          break
        case 'Y':
          record[f.name] = fBytes.length >= 8 ? Number(fBytes.readBigInt64LE(0)) / 10000 : null
          break
        case 'L':
          record[f.name] = ['t', 'T', 'y', 'Y', '1'].includes(rawStr)
          break
        case 'D':
          record[f.name] = rawStr
          break
        case 'M':
          record[f.name] = ''
          break
        default:
          record[f.name] = rawStr
      }
    }
    records.push(record)
  }

  return records
}

function leerTablaSiExiste(carpeta: string, nombreTabla: string) {
  try {
    const archivos = fs.readdirSync(carpeta)
    const coincidencia = archivos.find((a: string) => a.toLowerCase() === `${nombreTabla.toLowerCase()}.dbf`)
    if (!coincidencia) return []

    const rutaCompleta = path.join(carpeta, coincidencia)
    const stats = fs.statSync(rutaCompleta)
    if (stats.size < 32) return []

    return leerDbfNativo(rutaCompleta)
  } catch (err: any) {
    return []
  }
}

ipcMain.handle('dialog:seleccionarCarpeta', async () => {
  if (!win) return null
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Seleccionar Carpeta de la Empresa en Memory',
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

ipcMain.handle('empresa:cargarDatos', async (_: any, rutaCarpeta: string) => {
  try {
    const empresa = leerTablaSiExiste(rutaCarpeta, 'empresa')
    const liquidaciones = leerTablaSiExiste(rutaCarpeta, 'liquidac')
    const empleados = leerTablaSiExiste(rutaCarpeta, 'empleado')
    const provincias = leerTablaSiExiste(rutaCarpeta, 'provincia')
    const ctasbanc = leerTablaSiExiste(rutaCarpeta, 'ctasbanc')
    const conceptosreales = leerTablaSiExiste(rutaCarpeta, 'concepto')

    return {
      exito: true,
      empresa: empresa[0] || null,
      liquidaciones,
      empleados,
      conceptos: conceptosreales,
      provincias,
      bancos: ctasbanc
    }
  } catch (error: any) {
    return { exito: false, error: error.message }
  }
})

ipcMain.handle('empresa:obtenerMovimientos', async (_: any, { rutaCarpeta, idLiquidacion }: { rutaCarpeta: string; idLiquidacion: number }) => {
  try {
    const movimientos = leerTablaSiExiste(rutaCarpeta, 'movimien')
    const filtrados = movimientos.filter((m: any) => m.IN_IDENTIF === idLiquidacion)
    return { exito: true, movimientos: filtrados }
  } catch (error: any) {
    return { exito: false, error: error.message }
  }
})

ipcMain.handle('recibo:guardarPdf', async (event: any, nombreSugerido: string) => {
  if (!win) return false
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Guardar Recibo de Sueldo',
    defaultPath: nombreSugerido,
    filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
  })
  if (canceled || !filePath) return false

  try {
    const data = await event.sender.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 }
    })
    fs.writeFileSync(filePath, data)
    return true
  } catch (error) {
    return false
  }
})

ipcMain.handle('dialog:seleccionarCarpetaDestino', async () => {
  if (!win) return null
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Seleccionar Carpeta para Guardar Recibos en Lote',
    properties: ['openDirectory']
  })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

ipcMain.handle('recibo:guardarPdfSilencioso', async (event: any, { rutaDestino, nombreArchivo }: { rutaDestino: string; nombreArchivo: string }) => {
  try {
    const rutaCompleta = path.join(rutaDestino, nombreArchivo)
    const data = await event.sender.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 }
    })
    fs.writeFileSync(rutaCompleta, data)
    return true
  } catch (error) {
    return false
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.whenReady().then(createWindow)