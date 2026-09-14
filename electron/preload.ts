import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  seleccionarCarpeta: () => ipcRenderer.invoke('dialog:seleccionarCarpeta'),
  cargarDatosEmpresa: (ruta: string) => ipcRenderer.invoke('empresa:cargarDatos', ruta),
  obtenerMovimientos: (params: { rutaCarpeta: string; idLiquidacion: number }) =>
    ipcRenderer.invoke('empresa:obtenerMovimientos', params),
  guardarPdf: (nombreSugerido: string) => ipcRenderer.invoke('recibo:guardarPdf', nombreSugerido),
  
  // NUEVAS FUNCIONES PARA LOTE
  seleccionarCarpetaDestino: () => ipcRenderer.invoke('dialog:seleccionarCarpetaDestino'),
  guardarPdfSilencioso: (params: { rutaDestino: string; nombreArchivo: string }) => 
    ipcRenderer.invoke('recibo:guardarPdfSilencioso', params)
})