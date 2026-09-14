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
  cargasSociales: {
    seguridadSocial: { trabajador: number; empleador: number; total: number }
    obraSocial: { trabajador: number; empleador: number; total: number }
    inssjp: { trabajador: number; empleador: number; total: number }
    art: { trabajador: number; empleador: number; total: number }
    scvo: { trabajador: number; empleador: number; total: number }
  }
}

export function procesarLiquidacionEmpleado(
  movimientos: any[],
  legajo: string,
  conceptosMap: Record<string, string>
): DatosReciboProcesados {
  const movs = movimientos.filter(
    (m) => String(Number(m.EM_CODIGO)) === String(Number(legajo))
  )

  const haberes: ConceptoRecibo[] = []
  const descuentos: ConceptoRecibo[] = []

  let totalHaberesRem = 0
  let totalHaberesNoRem = 0
  let totalDesc = 0

  // Variables de cargas sociales
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
    const descripcion = conceptosMap[codStr] || `Concepto ${codStr}`

    // 1. Haberes (Sueldo y Adicionales)
    if (codNum >= 1 && codNum < 4000) {
      if (total > 0) {
        haberes.push({ codigo: codStr, descripcion, cantidad, base, total })
        // Si el código está en rango no remunerativo (ej 2200-2299 habitual en Worky)
        if (codNum >= 2200 && codNum <= 2299) {
          totalHaberesNoRem += total
        } else {
          totalHaberesRem += total
        }
      }
    }

    // 2. Descuentos del Trabajador (Aportes de Ley y Sindicatos)
    else if (codNum >= 5000 && codNum < 5800) {
      if (total > 0) {
        descuentos.push({ codigo: codStr, descripcion, cantidad, base, total })
        totalDesc += total

        // Clasificar para el cuadro de Cargas
        if (codNum === 5001 || codNum === 5003) segSocTrabajador += total
        if (codNum === 5005 || codNum === 5006) inssjpTrabajador += total
        if (codNum === 5020 || codNum === 5022) osTrabajador += total
      }
    }

    // 3. Contribuciones Patronales
    else if (codNum >= 9910 && codNum <= 9999) {
      if (codNum === 9911) segSocEmpleador += total // Jubilación/SIPA Patronal correcto
      if (codNum === 9912) osEmpleador += total     // Obra Social Patronal
      if (codNum === 9910) artEmpleador += total    // ART
      if (codNum === 9913) scvoEmpleador += total   // SCVO
    }
  })

  return {
    haberes,
    descuentos,
    totalHaberesRemunerativos: totalHaberesRem,
    totalHaberesNoRemunerativos: totalHaberesNoRem,
    totalHaberes: totalHaberesRem + totalHaberesNoRem,
    totalDescuentos: totalDesc,
    netoAPercibir: totalHaberesRem + totalHaberesNoRem - totalDesc,
    cargasSociales: {
      seguridadSocial: {
        trabajador: segSocTrabajador,
        empleador: segSocEmpleador,
        total: segSocTrabajador + segSocEmpleador
      },
      obraSocial: {
        trabajador: osTrabajador,
        empleador: osEmpleador,
        total: osTrabajador + osEmpleador
      },
      inssjp: {
        trabajador: inssjpTrabajador,
        empleador: inssjpEmpleador,
        total: inssjpTrabajador + inssjpEmpleador
      },
      art: {
        trabajador: 0,
        empleador: artEmpleador,
        total: artEmpleador
      },
      scvo: {
        trabajador: 0,
        empleador: scvoEmpleador,
        total: scvoEmpleador
      }
    }
  }
}