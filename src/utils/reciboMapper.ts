export interface ConceptoRecibo {
  codigo: string
  descripcion: string
  cantidad: number
  base: number
  total: number
}

export interface DatosReciboProcesados {
  haberes: ConceptoRecibo[]
  descuentos: ConceptoRecibo[]
  totalHaberesRemunerativos: number
  totalHaberesNoRemunerativos: number
  totalHaberes: number
  totalDescuentos: number
  netoAPercibir: number
  cuotaSindicato: number
  cargasSociales: {
    seguridadSocial: { trabajador: number; empleador: number; total: number }
    obraSocial: { trabajador: number; empleador: number; total: number }
    inssjp: { trabajador: number; empleador: number; total: number }
    art: { trabajador: number; empleador: number; total: number }
    scvo: { trabajador: number; empleador: number; total: number }
  }
}

export const parsearFechaDBF = (val: any): Date | null => {
  if (!val) return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val

  const str = String(val).trim()
  if (!str || str === '-' || str === 'S/D' || str === '0') return null

  // Formato YYYYMMDD (común en DBF FoxPro, ej: "19861103")
  if (/^\d{8}$/.test(str)) {
    const y = parseInt(str.slice(0, 4), 10)
    const m = parseInt(str.slice(4, 6), 10) - 1
    const d = parseInt(str.slice(6, 8), 10)
    const date = new Date(y, m, d)
    return isNaN(date.getTime()) ? null : date
  }

  // Formato DD/MM/YYYY o DD-MM-YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    const parts = str.split(/[-/]/)
    const d = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const y = parseInt(parts[2], 10)
    const date = new Date(y, m, d)
    return isNaN(date.getTime()) ? null : date
  }

  const date = new Date(str)
  return isNaN(date.getTime()) ? null : date
}

export const formatearFechaVisual = (val: any): string => {
  const date = parsearFechaDBF(val)
  if (!date) return '-'
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${d}/${m}/${y}`
}

export const calcularAniosAntiguedad = (
  fechaIngreso: any,
  fechaLiquidacion: any
): number => {
  const ingreso = parsearFechaDBF(fechaIngreso)
  const liquidacion = parsearFechaDBF(fechaLiquidacion) || new Date()

  if (!ingreso) return 0

  let anios = liquidacion.getFullYear() - ingreso.getFullYear()
  const diferenciaMeses = liquidacion.getMonth() - ingreso.getMonth()

  if (
    diferenciaMeses < 0 ||
    (diferenciaMeses === 0 && liquidacion.getDate() - ingreso.getDate() < 0)
  ) {
    anios--
  }

  return Math.max(0, anios)
}

// Extracción directa de las columnas oficiales de Memory Worky
export const obtenerFechaEmpleadoFlexible = (empleado: any, _tipo: 'ingreso' | 'reconocida'): any => {
  if (!empleado) return ''

  // NOTA: Memory Worky no almacena la fecha de ingreso en la tabla de empleados
  // Solo disponibles: EM_FECHNAC (fecha de nacimiento)
  // Por ahora, retorna vacío para mantener compatibilidad
  return ''
}

export function procesarLiquidacionEmpleado(
  movimientos: any[],
  legajo: string,
  conceptosMap: Record<string, string>,
  _empleadoDBF: any,
  fechaLiquidacion: any,
  fechaIngresoManual?: string,
  usarFechaIngresoManual: boolean = false,
): DatosReciboProcesados {
  const fechaIngreso = usarFechaIngresoManual ? (fechaIngresoManual || '') : ''
  const rawReconocida = usarFechaIngresoManual ? fechaIngreso : ''

  const movs = movimientos.filter(
    (m) => String(Number(m.EM_CODIGO)) === String(Number(legajo))
  )

  const haberes: ConceptoRecibo[] = []
  const descuentos: ConceptoRecibo[] = []

  let totalHaberesRem = 0
  let totalHaberesNoRem = 0
  let totalDesc = 0

  let segSocTrabajador = 0
  let segSocEmpleador = 0
  let osTrabajador = 0
  let osEmpleador = 0
  let inssjpTrabajador = 0
  let inssjpEmpleador = 0
  let artEmpleador = 0
  let scvoEmpleador = 0

  movs.forEach((m) => {
    const codNum = Number(m.CO_CODIGO)
    const codStr = String(codNum)
    const total = Number(m.MV_TOTALPE) || 0
    const base = Number(m.MV_VALORPE) || 0
    const cantidad = Number(m.MV_CANTIDA) || 0
    let descripcion = conceptosMap[codStr] || `Concepto ${codStr}`

    if (codNum === 701 && usarFechaIngresoManual && rawReconocida) {
      const anios = calcularAniosAntiguedad(rawReconocida, fechaLiquidacion)
      console.log(`[MAPPER] Concepto 701 detectado. Años calculados: ${anios} usando fecha:`, rawReconocida)
      
      const leyendaAdicional = anios > 10 
        ? `(1% x ${anios} años + 1% adicional)` 
        : `(1% x ${anios} años)`
        
      descripcion = `${descripcion}\n${leyendaAdicional}`
    }

    if (codNum >= 1 && codNum < 4000) {
      if (total > 0) {
        haberes.push({ codigo: codStr, descripcion, cantidad, base, total })
        if (codNum >= 2200 && codNum <= 2299) {
          totalHaberesNoRem += total
        } else {
          totalHaberesRem += total
        }
      }
    } else if (codNum >= 5000 && codNum < 5800) {
      if (total > 0) {
        descuentos.push({ codigo: codStr, descripcion, cantidad, base, total })
        totalDesc += total

        if (codNum === 5001 || codNum === 5003) segSocTrabajador += total
        if (codNum === 5005 || codNum === 5006) inssjpTrabajador += total
        if (codNum === 5020 || codNum === 5022) osTrabajador += total
      }
    } else if (codNum >= 9910 && codNum <= 9999) {
      if (codNum === 9911) segSocEmpleador += total
      if (codNum === 9912) osEmpleador += total
      if (codNum === 9910) artEmpleador += total
      if (codNum === 9913) scvoEmpleador += total
    }
  })

  const totalHab = totalHaberesRem + totalHaberesNoRem
  const cuotaSindicatoExtraida = totalHab > 0 ? totalHab * 0.02 : 0

  if (cuotaSindicatoExtraida > 0) {
    descuentos.push({
      codigo: '5900',
      descripcion: 'Sindicato 2%',
      cantidad: 0,
      base: 0,
      total: cuotaSindicatoExtraida,
    })
    totalDesc += cuotaSindicatoExtraida
  }

  return {
    haberes,
    descuentos,
    totalHaberesRemunerativos: totalHaberesRem,
    totalHaberesNoRemunerativos: totalHaberesNoRem,
    totalHaberes: totalHab,
    totalDescuentos: totalDesc,
    netoAPercibir: totalHab - totalDesc,
    cuotaSindicato: cuotaSindicatoExtraida,
    cargasSociales: {
      seguridadSocial: { trabajador: segSocTrabajador, empleador: segSocEmpleador, total: segSocTrabajador + segSocEmpleador },
      obraSocial: { trabajador: osTrabajador, empleador: osEmpleador, total: osTrabajador + osEmpleador },
      inssjp: { trabajador: inssjpTrabajador, empleador: inssjpEmpleador, total: inssjpTrabajador + inssjpEmpleador },
      art: { trabajador: 0, empleador: artEmpleador, total: artEmpleador },
      scvo: { trabajador: 0, empleador: scvoEmpleador, total: scvoEmpleador }
    }
  }
}