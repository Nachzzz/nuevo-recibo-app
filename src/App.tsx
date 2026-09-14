import { useState, useEffect } from 'react'
import { procesarLiquidacionEmpleado } from './utils/reciboMapper'
import { ReciboImprimible, DatosDepositoSocial } from './components/ReciboImprimible'
import { generarArchivoARCA, descargarTxtLSD, ReciboArca } from '../src/utils/arcaExporter'

interface BancoOpcion {
  valor: string
  etiqueta: string
}

export default function App() {
  const [rutaCarpeta, setRutaCarpeta] = useState<string>('')
  const [empresa, setEmpresa] = useState<any>(null)
  const [liquidaciones, setLiquidaciones] = useState<any[]>([])
  const [empleados, setEmpleados] = useState<any[]>([])
  const [bancosDisponibles, setBancosDisponibles] = useState<BancoOpcion[]>([])
  const [conceptosMap, setConceptosMap] = useState<Record<string, string>>({})

  const [idLiqSeleccionada, setIdLiqSeleccionada] = useState<number | ''>('')
  const [legajoSeleccionado, setLegajoSeleccionado] = useState<string>('')
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [cargando, setCargando] = useState<boolean>(false)

  const [guardandoPdf, setGuardandoPdf] = useState<boolean>(false)
  const [procesandoLote, setProcesandoLote] = useState<{ actual: number; total: number } | null>(null)

  const hoyStr = new Date().toISOString().split('T')[0]
  const [fechaUltimoPago, setFechaUltimoPago] = useState<string>(hoyStr)
  const [periodoPagado, setPeriodoPagado] = useState<string>('')
  const [bancoPagadoCon, setBancoPagadoCon] = useState<string>('')

  // Estados para el Modal del CUIT (Solución al prompt de Electron)
  const [mostrarModalCuit, setMostrarModalCuit] = useState<boolean>(false)
  const [cuitManual, setCuitManual] = useState<string>('')

  useEffect(() => {
    const rutaGuardada = localStorage.getItem('rutaEmpresaPredeterminada')
    if (rutaGuardada) {
      cargarEmpresaDesdeRuta(rutaGuardada)
    }
  }, [])

  const normalizarBanco = (b: any): BancoOpcion => {
    const nombre = String(
      b.CB_DESCRI || b.CB_BANCO || b.CB_DESCRIP || b.CB_NOMBRE || b.DESCRI || b.BANCO || ''
    ).trim()
    const nroCta = String(b.CB_NUMCTA || b.CB_NROCUE || b.CB_NUMERO || b.CB_CUENTA || '').trim()
    const codigo = String(b.CB_CODIGO || '').trim()

    const etiqueta = nombre && nroCta ? `${nombre} (Cta: ${nroCta})` : nombre || `Cuenta #${codigo}`
    const valor = nombre || etiqueta
    return { valor, etiqueta }
  }

  const cargarEmpresaDesdeRuta = async (ruta: string) => {
    try {
      setRutaCarpeta(ruta)
      setCargando(true)
      const res = await window.api.cargarDatosEmpresa(ruta)

      if (res.exito) {
        const empresaData = res.empresa ? { ...res.empresa } : {}

        if (empresaData.PR_CODIGO && res.provincias && res.provincias.length > 0) {
          const provMatch = res.provincias.find(
            (p: any) => String(p.PR_CODIGO).trim() === String(empresaData.PR_CODIGO).trim()
          )
          if (provMatch) {
            empresaData.PROVINCIA_NOMBRE = provMatch.PR_DESCRI || provMatch.PR_NOMBRE || provMatch.DESCRIP
          }
        }

        const liquidacionesOrdenadas = (res.liquidaciones || []).slice().sort((a: any, b: any) => {
          const fA = String(a.IN_FECHA || '').trim()
          const fB = String(b.IN_FECHA || '').trim()
          if (fA && fB && fA !== fB) return fB.localeCompare(fA)
          return Number(b.IN_IDENTIF || 0) - Number(a.IN_IDENTIF || 0)
        })

        const empleadosOrdenados = (res.empleados || []).slice().sort((a: any, b: any) => {
          const apeA = String(a.EM_APE1 || '').trim().toLowerCase()
          const apeB = String(b.EM_APE1 || '').trim().toLowerCase()
          return apeA.localeCompare(apeB)
        })

        const bancosParsed = (res.bancos || []).map(normalizarBanco).filter((b: BancoOpcion) => b.valor.length > 0)

        setEmpresa(empresaData)
        setLiquidaciones(liquidacionesOrdenadas)
        setEmpleados(empleadosOrdenados)
        setBancosDisponibles(bancosParsed)
        if (bancosParsed.length > 0) setBancoPagadoCon(bancosParsed[0].valor)

        if (res.conceptos && res.conceptos.length > 0) {
          const map: Record<string, string> = {}
          res.conceptos.forEach((c: any) => {
            const codigoRaw = c.CO_CODIGO ?? c.CODIGO ?? c.CO_NUMERO
            const descRaw = c.CO_DESCRI ?? c.CO_DESCRIP ?? c.DESCRIP ?? c.CO_NOMBRE
            if (codigoRaw !== undefined && descRaw !== undefined) {
              map[String(Number(codigoRaw))] = String(descRaw).trim()
            }
          })
          setConceptosMap(map)
        }
      } else {
        alert('No se pudieron leer los datos. Si la ruta cambió, seleccione la carpeta nuevamente.')
        localStorage.removeItem('rutaEmpresaPredeterminada')
      }
    } catch (error: any) {
      alert('Ocurrió un error al cargar la empresa: ' + error.message)
    } finally {
      setCargando(false)
    }
  }

  const handleSeleccionarCarpeta = async () => {
    const ruta = await window.api.seleccionarCarpeta()
    if (ruta) cargarEmpresaDesdeRuta(ruta)
  }

  const handleGuardarRuta = () => {
    if (rutaCarpeta) {
      localStorage.setItem('rutaEmpresaPredeterminada', rutaCarpeta)
      alert('¡Empresa fijada! La próxima vez que inicies la aplicación se cargará esta base de datos automáticamente.')
    }
  }

  const handleRefrescarLimpiar = () => {
    setIdLiqSeleccionada('')
    setLegajoSeleccionado('')
    setMovimientos([])
    setPeriodoPagado('')
    if (rutaCarpeta) {
      cargarEmpresaDesdeRuta(rutaCarpeta)
    }
  }

  const handleCargarMovimientos = async (idLiq: number) => {
    setIdLiqSeleccionada(idLiq)
    setLegajoSeleccionado('')

    const liqElegida = liquidaciones.find((l) => l.IN_IDENTIF === idLiq)
    if (liqElegida?.IN_ABREVIA) {
      setPeriodoPagado(String(liqElegida.IN_ABREVIA).trim())
    }

    const res = await window.api.obtenerMovimientos({ rutaCarpeta, idLiquidacion: idLiq })
    if (res.exito && res.movimientos) {
      setMovimientos(res.movimientos)
    }
  }

  const handleGuardarPdf = async () => {
    if (!empleadoActual || !liquidacionActual) return
    setGuardandoPdf(true)
    const nombreSugerido = `Recibo_${empleadoActual.EM_CODIGO}_${liquidacionActual.IN_ABREVIA || idLiqSeleccionada}.pdf`
    await window.api.guardarPdf(nombreSugerido)
    setGuardandoPdf(false)
  }

  const handleExportarLote = async () => {
    if (!idLiqSeleccionada || movimientos.length === 0) return

    const legajosConMovimientos = Array.from(new Set(movimientos.map((m: any) => String(m.EM_CODIGO).trim())))
    if (legajosConMovimientos.length === 0) {
      alert('No hay empleados liquidados en este período.')
      return
    }

    const rutaDestino = await window.api.seleccionarCarpetaDestino()
    if (!rutaDestino) return

    const legajoOriginal = legajoSeleccionado
    setProcesandoLote({ actual: 0, total: legajosConMovimientos.length })
    let procesados = 0

    for (const legajo of legajosConMovimientos) {
      setLegajoSeleccionado(legajo)
      await new Promise(resolve => setTimeout(resolve, 350))

      const emp = empleados.find(e => String(e.EM_CODIGO).trim() === legajo)
      const apellidos = [emp?.EM_APE1, emp?.EM_APE2].filter(Boolean).map((s: string) => String(s).trim()).join('_')
      const nombres = [emp?.EM_NOM1, emp?.EM_NOM2].filter(Boolean).map((s: string) => String(s).trim()).join('_')
      const nombreSaneado = `${apellidos}_${nombres}`.replace(/[^a-zA-Z0-9_\-]/g, '')

      const periodoSaneado = String(periodoPagado || idLiqSeleccionada).replace(/[\/\\]/g, '-')
      const nombreArchivo = `${legajo}_${nombreSaneado}_${periodoSaneado}.pdf`

      await window.api.guardarPdfSilencioso({ rutaDestino, nombreArchivo })

      procesados++
      setProcesandoLote({ actual: procesados, total: legajosConMovimientos.length })
    }

    setProcesandoLote(null)
    setLegajoSeleccionado(legajoOriginal)
    alert(`¡Exportación masiva exitosa! Se guardaron ${procesados} recibos en la carpeta destino.`)
  }

  const handleExportarARCA = () => {
    if (!idLiqSeleccionada || movimientos.length === 0) {
      alert('Primero seleccione una liquidación con movimientos válidos.');
      return;
    }

    const legajosConMovimientos = Array.from(new Set(movimientos.map((m: any) => String(m.EM_CODIGO).trim())));
    if (legajosConMovimientos.length === 0) {
      alert('No hay empleados liquidados en este período.');
      return;
    }

    const recibosParaArca: ReciboArca[] = legajosConMovimientos.map(legajo => {
      const emp = empleados.find(e => String(e.EM_CODIGO).trim() === legajo);
      const datosProcesados = procesarLiquidacionEmpleado(movimientos, legajo, conceptosMap);
      
      return {
        cuil: emp?.EM_CUIL || '',
        haberes: datosProcesados.haberes.map((h: any) => ({
          codigo: h.codigo || h.CO_CODIGO || h.cod || h.concepto, 
          total: Number(h.total || h.monto || h.importe || 0)
        })),
        descuentos: datosProcesados.descuentos.map((d: any) => ({
          codigo: d.codigo || d.CO_CODIGO || d.cod || d.concepto,
          total: Number(d.total || d.monto || d.importe || 0)
        }))
      };
    }).filter(r => r.cuil);

    const liquidacionLocal = liquidaciones.find((l) => l.IN_IDENTIF === idLiqSeleccionada);
    const rawPeriodo = periodoPagado || liquidacionLocal?.IN_ABREVIA || '';
    let periodoArca = rawPeriodo.replace(/\D/g, ''); 
    
    if (periodoArca.length === 6 && rawPeriodo.includes('-')) {
      const parts = rawPeriodo.split('-');
      if (parts[0].length === 2 && parts[1].length === 4) periodoArca = `${parts[1]}${parts[0]}`;
    }

    const fechaPagoArca = fechaUltimoPago.replace(/-/g, '');
    
    // Mapeo exhaustivo para encontrar el CUIT
    const cuitBase = empresa?.EM_CUIT || empresa?.CUIT || empresa?.PR_CUIT || empresa?.EMP_CUIT || empresa?.EM_RUT || empresa?.EM_NROCUI || empresa?.EM_IDENTIF || '';
    let cuitArca = String(cuitBase).replace(/\D/g, '');

    // Si el CUIT no existe en la base o es inválido, lanzamos el Modal de React en vez del prompt de Electron
    if (!cuitArca || cuitArca.length !== 11) {
      if (cuitManual && cuitManual.replace(/\D/g, '').length === 11) {
        cuitArca = cuitManual.replace(/\D/g, '');
      } else {
        setMostrarModalCuit(true);
        return; // Frenamos acá hasta que el usuario cargue el CUIT
      }
    }

    const contenidoTxt = generarArchivoARCA(cuitArca, periodoArca, fechaPagoArca, recibosParaArca);
    descargarTxtLSD(contenidoTxt, `librosueldos_${periodoArca}.txt`);
  };

  const formatearOpcionLiquidacion = (liq: any) => {
    const desc = String(liq.IN_DESCRIP || '').trim()
    const abrevia = String(liq.IN_ABREVIA || '').trim()
    return desc && abrevia ? `${desc} — [${abrevia}]` : desc || `Liquidación #${liq.IN_IDENTIF}`
  }

  const formatearOpcionEmpleado = (emp: any) => {
    const legajo = String(emp.EM_CODIGO || '').trim()
    const apellidos = [emp.EM_APE1, emp.EM_APE2].filter(Boolean).map((s: string) => String(s).trim()).join(' ')
    const nombres = [emp.EM_NOM1, emp.EM_NOM2].filter(Boolean).map((s: string) => String(s).trim()).join(' ')
    const cuil = String(emp.EM_CUIL || '').trim()
    const nombreCompleto = [apellidos, nombres].filter(Boolean).join(', ')
    return nombreCompleto ? `Legajo ${legajo} — ${nombreCompleto} ${cuil ? `(CUIL: ${cuil})` : ''}` : `Legajo ${legajo}`
  }

  const formatearFechaVisual = (fechaIso: string) => {
    if (!fechaIso) return ''
    const partes = fechaIso.split('-')
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`
    return fechaIso
  }

  const datosRecibo = legajoSeleccionado && movimientos.length > 0
    ? procesarLiquidacionEmpleado(movimientos, legajoSeleccionado, conceptosMap)
    : null

  const empleadoActual = empleados.find((e) => String(Number(e.EM_CODIGO)) === String(Number(legajoSeleccionado)))
  const liquidacionActual = liquidaciones.find((l) => l.IN_IDENTIF === idLiqSeleccionada)
  
  // Calculamos el CUIT para mostrarlo en el header (Usa el manual si lo llenaron)
  const cuitBaseHeader = empresa?.EM_CUIT || empresa?.CUIT || empresa?.PR_CUIT || empresa?.EMP_CUIT || empresa?.EM_RUT || empresa?.EM_NROCUI || empresa?.EM_IDENTIF;
  const cuitEmpresaVisual = cuitBaseHeader ? cuitBaseHeader : (cuitManual || 'S/D');

  const datosDepositoObj: DatosDepositoSocial = {
    fechaPago: formatearFechaVisual(fechaUltimoPago),
    periodoPagado: periodoPagado,
    banco: bancoPagadoCon
  }
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 print:bg-white print:p-0 print:m-0 print:min-h-0 print:text-black">
      
      {/* MODAL PARA PEDIR EL CUIT (Filtra el error de Electron) */}
      {mostrarModalCuit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 print:hidden">
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-sky-400 mb-2">Falta CUIT de la Empresa</h3>
            <p className="text-sm text-slate-300 mb-4">
              La base de datos antigua no tiene un CUIT válido cargado. Por favor, ingresá los 11 números sin guiones para generar el archivo de ARCA.
            </p>
            <input
              type="text"
              value={cuitManual}
              onChange={(e) => setCuitManual(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 20173387408"
              maxLength={11}
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white mb-5 outline-none focus:border-sky-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMostrarModalCuit(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (cuitManual.length !== 11) {
                    alert('El CUIT debe tener exactamente 11 números.');
                    return;
                  }
                  setMostrarModalCuit(false);
                  handleExportarARCA(); // Reintenta generar el archivo
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded text-sm font-semibold transition"
              >
                Confirmar y Exportar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-4 mb-6 print:hidden gap-4">
        <div className="w-full md:w-auto flex items-center gap-4">
          <img src="./logo.png" alt="LineUp Soluciones" className="h-12 w-auto drop-shadow-md" />
          <div>
            <h1 className="text-xl font-bold text-sky-400">Generador de Recibos</h1>
            <p className="text-xs text-slate-400 truncate max-w-xl">
              {empresa ? `${String(empresa.EM_NOMBRE || '').trim()} | CUIT: ${cuitEmpresaVisual} | Ruta: ${rutaCarpeta}` : 'Desarrollado por LineUp Soluciones'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {rutaCarpeta && (
            <>
              <button
                onClick={handleRefrescarLimpiar}
                disabled={!!procesandoLote}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded text-sm font-semibold transition shadow flex items-center gap-2"
                title="Limpiar selecciones y recargar la base de datos"
              >
                🔄 Limpiar / Actualizar
              </button>
              <button
                onClick={handleGuardarRuta}
                disabled={!!procesandoLote}
                className="px-4 py-2 bg-sky-800 hover:bg-sky-700 disabled:opacity-50 rounded text-sm font-semibold transition shadow flex items-center gap-2"
                title="Fijar esta empresa para el inicio"
              >
                📌 Fijar Ruta
              </button>
            </>
          )}
          <button
            onClick={handleSeleccionarCarpeta}
            disabled={!!procesandoLote}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded text-sm font-semibold transition shadow-md flex items-center gap-2"
          >
            📁 {cargando ? 'Cargando...' : 'Abrir Empresa'}
          </button>
        </div>
      </header>

      {/* Pantalla de Bienvenida */}
      {!rutaCarpeta && (
        <div className="flex flex-col items-center justify-center mt-24 print:hidden">
          <img
            src="./logo.png"
            alt="LineUp Soluciones"
            className="h-40 w-auto mb-6 drop-shadow-2xl grayscale opacity-50 transition-all hover:grayscale-0 hover:opacity-100 duration-500"
          />
          <h2 className="text-2xl font-bold text-slate-500 mb-2">Sistema de Emisión de Recibos</h2>
          <p className="text-sm text-slate-600 max-w-md text-center mb-8">
            Seleccioná la carpeta de la empresa de Memory para comenzar a generar los recibos de sueldo en formato PDF.
          </p>
          <button
            onClick={handleSeleccionarCarpeta}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-bold transition shadow-lg flex items-center gap-2"
          >
            📁 Abrir Base de Datos
          </button>
        </div>
      )}

      {rutaCarpeta && (
        <div className="space-y-4 mb-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Liquidación (Periodo)</label>
              <select
                value={idLiqSeleccionada}
                onChange={(e) => handleCargarMovimientos(Number(e.target.value))}
                disabled={!!procesandoLote}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              >
                <option value="">-- Seleccionar Periodo / Liquidación --</option>
                {liquidaciones.map((l: any, i) => (
                  <option key={i} value={l.IN_IDENTIF}>
                    {formatearOpcionLiquidacion(l)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Empleado</label>
              <select
                value={legajoSeleccionado}
                onChange={(e) => setLegajoSeleccionado(e.target.value)}
                disabled={!!procesandoLote}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
              >
                <option value="">-- Seleccionar Empleado --</option>
                {empleados.map((emp: any, i) => (
                  <option key={i} value={String(emp.EM_CODIGO).trim()}>
                    {formatearOpcionEmpleado(emp)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3">
              Constancia de Depósito de Cargas Sociales (Art. 140 LCT)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Último Pago</label>
                <input
                  type="date"
                  value={fechaUltimoPago}
                  onChange={(e) => setFechaUltimoPago(e.target.value)}
                  disabled={!!procesandoLote}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Período</label>
                <input
                  type="text"
                  value={periodoPagado}
                  onChange={(e) => setPeriodoPagado(e.target.value)}
                  disabled={!!procesandoLote}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pagado con</label>
                {bancosDisponibles.length > 0 ? (
                  <select
                    value={bancoPagadoCon}
                    onChange={(e) => setBancoPagadoCon(e.target.value)}
                    disabled={!!procesandoLote}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                  >
                    {bancosDisponibles.map((b, i) => (
                      <option key={i} value={b.valor}>{b.etiqueta}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={bancoPagadoCon}
                    onChange={(e) => setBancoPagadoCon(e.target.value)}
                    disabled={!!procesandoLote}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {liquidacionActual && (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row justify-between items-center bg-slate-800 border border-slate-700 p-4 rounded-lg print:hidden gap-4">
            <div className="w-full xl:w-auto">
              {procesandoLote ? (
                <>
                  <span className="text-xs text-sky-400 block font-bold mb-1">Exportación Masiva en Progreso</span>
                  <span className="text-sm text-white font-mono block mb-2">Generando recibo {procesandoLote.actual} de {procesandoLote.total}...</span>
                  <div className="w-full md:w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300"
                      style={{ width: `${(procesandoLote.actual / procesandoLote.total) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400 block font-mono">
                    {empleadoActual ? formatearOpcionEmpleado(empleadoActual) : 'Seleccione un empleado o exporte el lote completo.'}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    Liquidación activa: {liquidacionActual?.IN_ABREVIA || idLiqSeleccionada}
                  </span>
                </>
              )}
            </div>

            {/* BOTONERA DE EXPORTACIONES */}
            <div className="flex flex-wrap gap-3">
              {/* <button
                onClick={handleExportarARCA}
                disabled={!!procesandoLote || movimientos.length === 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow transition flex items-center gap-2"
              >
                🏛️ Generar TXT Libro Sueldos Digital
              </button> */}

              <button
                onClick={handleExportarLote}
                disabled={guardandoPdf || !!procesandoLote || movimientos.length === 0}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow transition flex items-center gap-2"
              >
                🗂️ Exportar Todos
              </button>

              {datosRecibo && empleadoActual && (
                <button
                  onClick={handleGuardarPdf}
                  disabled={guardandoPdf || !!procesandoLote}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-lg transition flex items-center gap-2"
                >
                  {guardandoPdf ? 'Generando...' : '📄 Guardar Actual'}
                </button>
              )}
            </div>
          </div>

          {datosRecibo && empleadoActual && (
            <div className="py-4">
              <ReciboImprimible
                empresa={empresa}
                empleado={empleadoActual}
                liquidacion={liquidacionActual}
                datos={datosRecibo}
                datosDeposito={datosDepositoObj}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}