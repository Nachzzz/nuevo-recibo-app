interface Window {
  api: {
    seleccionarArchivoDBF: () => Promise<string | null>
    leerRegistrosDBF: (rutaArchivo: string) => Promise<{
      exito: boolean
      campos?: string[]
      registros?: any[]
      error?: string
    }>
  }
}