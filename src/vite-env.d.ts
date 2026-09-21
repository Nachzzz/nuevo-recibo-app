/// <reference types="vite/client" />

interface Window {
  api: {
    seleccionarCarpeta: () => Promise<string | null>
    cargarDatosEmpresa: (ruta: string) => Promise<{
      exito: boolean
      empresa?: any
      liquidaciones?: any[]
      empleados?: any[]
      categorias?: any[]
      conceptos?: any[]
      provincias?: any[]
      bancos?: any[]
      error?: string
    }>
    obtenerMovimientos: (params: { rutaCarpeta: string; idLiquidacion: number }) => Promise<{
      exito: boolean
      movimientos?: any[]
      error?: string
    }>
    guardarPdf: (nombreSugerido: string) => Promise<boolean>
    
    // NUEVAS FUNCIONES PARA LOTE
    seleccionarCarpetaDestino: () => Promise<string | null>
    guardarPdfSilencioso: (params: { rutaDestino: string; nombreArchivo: string }) => Promise<boolean>
  }
}