import { DatosReciboProcesados, formatearFechaVisual } from '../utils/reciboMapper'
import { numeroALetras } from '../utils/numeroALetras'

export interface DatosDepositoSocial {
  fechaPago: string
  periodoPagado: string
  banco: string
}

interface Props {
  empresa: any
  empleado: any
  liquidacion: any
  datos: DatosReciboProcesados
  datosDeposito?: DatosDepositoSocial
  fechaIngresoManual?: string
  usarFechaIngresoManual?: boolean
}

const fmt = (valor: number) =>
  valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function detectarCuitEmpresa(empresa: any): string {
  if (!empresa) return 'S/D'
  for (const key of Object.keys(empresa)) {
    const k = key.toLowerCase()
    if (k.includes('cuit') || k.includes('rut') || k.includes('cui') || k.includes('identif')) {
      if (empresa[key]) return String(empresa[key]).trim()
    }
  }
  for (const val of Object.values(empresa)) {
    const s = String(val).replace(/\D/g, '')
    if (s.length === 11 && (s.startsWith('20') || s.startsWith('23') || s.startsWith('27') || s.startsWith('30') || s.startsWith('33'))) {
      return String(val).trim()
    }
  }
  return 'S/D'
}

function obtenerDomicilioFiscalEmpresa(empresa: any) {
  if (!empresa) return { direccion: '', cp: '', partido: '', provincia: '' }

  const calle = String(empresa.EM_CALLE || '').trim()
  const numero = String(empresa.EM_NUMERO || '').trim()
  const piso = empresa.EM_PISO ? `Piso ${String(empresa.EM_PISO).trim()}` : ''
  const dpto = empresa.EM_APTO ? `Dpto ${String(empresa.EM_APTO).trim()}` : ''
  const direccion = [calle, numero, piso, dpto].filter(Boolean).join(' ')

  let cp = ''
  for (const k of ['EM_CPOSTAL', 'EM_CP', 'EM_CODPOST', 'CPOSTAL', 'CP']) {
    if (empresa[k]) {
      cp = String(empresa[k]).trim()
      break
    }
  }

  let partido = ''
  for (const k of ['EM_PARTIDO', 'EM_LOCALID', 'EM_CIUDAD', 'EM_LOCAL', 'EM_SECCPOL', 'PARTIDO']) {
    if (empresa[k]) {
      partido = String(empresa[k]).trim()
      break
    }
  }

  let provincia = ''
  if (empresa.PROVINCIA_NOMBRE) {
    provincia = String(empresa.PROVINCIA_NOMBRE).trim()
  } else {
    for (const k of ['EM_PROVINC', 'EM_PROV', 'PROVINCIA']) {
      if (empresa[k]) {
        provincia = String(empresa[k]).trim()
        break
      }
    }
  }

  return { direccion, cp, partido, provincia }
}

// --- Generador Matemático del Gráfico SVG Mejorado ---
function GraficoCargasSVG({ pSegSoc, pOS, pINSSJP }: { pSegSoc: number, pOS: number, pINSSJP: number }) {
  const pOtros = Math.max(0, 100 - pSegSoc - pOS - pINSSJP)
  const data = [
    { name: 'Seg. Soc.', value: pSegSoc, color: '#0284c7' }, // Azul
    { name: 'O. Social', value: pOS, color: '#ea580c' },      // Naranja
    { name: 'PAMI', value: pINSSJP, color: '#16a34a' },       // Verde
    { name: 'Otros', value: pOtros, color: '#dc2626' }        // Rojo
  ].filter(d => d.value > 0)

  // Tamaño aumentado a 145px
  const size = 145 
  const radius = size / 2
  let cumulativePercent = 0

  function getCoords(percent: number) {
    const x = Math.cos(2 * Math.PI * percent) * radius
    const y = Math.sin(2 * Math.PI * percent) * radius
    return [x, y]
  }

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ transform: 'rotate(-90deg)', margin: '0 auto', display: 'block' }}
      className="drop-shadow-sm"
    >
      {data.map(slice => {
        if (slice.value >= 100) {
          return (
            <g key={slice.name}>
              <circle cx={radius} cy={radius} r={radius} fill={slice.color} />
              <text
                x={radius}
                y={radius}
                fill="#000000"
                fontSize="11"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(90, ${radius}, ${radius})`}
                style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: '3px', strokeLinejoin: 'round' }}
              >
                {slice.name} 100%
              </text>
            </g>
          )
        }

        const [startX, startY] = getCoords(cumulativePercent / 100)
        const midPercent = (cumulativePercent + slice.value / 2) / 100
        cumulativePercent += slice.value
        const [endX, endY] = getCoords(cumulativePercent / 100)

        const largeArcFlag = slice.value > 50 ? 1 : 0
        const pathData = [
          `M ${radius} ${radius}`,
          `L ${radius + startX} ${radius + startY}`,
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${radius + endX} ${radius + endY}`,
          'Z'
        ].join(' ')

        // Alejar el texto hacia los bordes (0.72) para dar más espacio a las porciones chicas
        const labelX = radius + Math.cos(2 * Math.PI * midPercent) * (radius * 0.72)
        const labelY = radius + Math.sin(2 * Math.PI * midPercent) * (radius * 0.72)

        return (
          <g key={slice.name}>
            <path d={pathData} fill={slice.color} stroke="#ffffff" strokeWidth="1.5" />
            
            {/* Umbral bajado a 5% para asegurar que se impriman todas las etiquetas relevantes */}
            {slice.value > 5 && (
              <text
                x={labelX}
                y={labelY - 5}
                fill="#000000" // Texto negro
                fontSize="9" // Más grande
                fontWeight="900" // Extra Bold
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(90, ${labelX}, ${labelY})`}
                // Borde blanco por detrás del texto para contraste perfecto
                style={{ paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: '3px', strokeLinejoin: 'round' }} 
              >
                <tspan x={labelX} dy="0">{slice.name}</tspan>
                <tspan x={labelX} dy="11">{Math.round(slice.value)}%</tspan>
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
// -----------------------------------------------------------

export function ReciboImprimible({ empresa, empleado, liquidacion, datos, datosDeposito, fechaIngresoManual, usarFechaIngresoManual = false }: Props) {
  const nombreEmpresa = String(empresa?.EM_NOMBRE || '').trim()
  const cuitEmpresa = detectarCuitEmpresa(empresa)
  const { direccion, cp, partido, provincia } = obtenerDomicilioFiscalEmpresa(empresa)

  const ape = [empleado?.EM_APE1, empleado?.EM_APE2].filter(Boolean).map((s: string) => String(s).trim()).join(' ')
  const nom = [empleado?.EM_NOM1, empleado?.EM_NOM2].filter(Boolean).map((s: string) => String(s).trim()).join(' ')
  const nombreEmpleado = `${ape}, ${nom}`
  const cuilEmpleado = empleado?.EM_CUIL || 'S/D'
  const legajo = String(empleado?.EM_CODIGO || '').trim()

  const rawIngreso = usarFechaIngresoManual ? (fechaIngresoManual || '') : ''
  const rawReconocida = usarFechaIngresoManual ? (fechaIngresoManual || '') : ''

  const fechaIngresoReal = formatearFechaVisual(rawIngreso)
  const fechaIngresoReconocida = formatearFechaVisual(rawReconocida)

  const letras = numeroALetras(datos.netoAPercibir)
  const letrasFormateadas = letras.charAt(0).toUpperCase() + letras.slice(1)

  const totalCargas =
    datos.cargasSociales.seguridadSocial.total +
    datos.cargasSociales.obraSocial.total +
    datos.cargasSociales.inssjp.total +
    datos.cargasSociales.art.total +
    datos.cargasSociales.scvo.total

  const pSegSoc = totalCargas > 0 ? (datos.cargasSociales.seguridadSocial.total / totalCargas) * 100 : 0
  const pOS = totalCargas > 0 ? (datos.cargasSociales.obraSocial.total / totalCargas) * 100 : 0
  const pINSSJP = totalCargas > 0 ? (datos.cargasSociales.inssjp.total / totalCargas) * 100 : 0

  // Cálculo de la cuota sindical del 2% sobre el total de haberes brutos
  const cuotaSindicato = datos.cuotaSindicato

  return (
    <div
      id="area-recibo"
      className="bg-white text-black p-6 max-w-[800px] mx-auto font-sans text-[11px] leading-tight border border-slate-300 shadow-2xl [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
    >
      <table className="w-full border border-black mb-2" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className="p-2.5 align-top" style={{ width: '75%' }}>
              <div className="text-sm font-black uppercase tracking-wide">{nombreEmpresa}</div>
              <div className="text-[11px] font-medium text-gray-800 mt-0.5">CUIT: {cuitEmpresa}</div>
              <div className="text-[11px] text-gray-700">
                Dirección: {direccion || 'S/D'} {cp ? `— CP: ${cp}` : ''}
              </div>
              {(partido || provincia) && (
                <div className="text-[11px] text-gray-700">
                  {partido ? `Partido / Localidad: ${partido}` : ''}
                  {partido && provincia ? ' — ' : ''}
                  {provincia ? `Provincia: ${provincia}` : ''}
                </div>
              )}
            </td>
            <td className="p-2.5 text-right align-top" style={{ width: '25%' }}>
              <span className="inline-block border border-black px-2 py-1 text-[9px] font-bold uppercase bg-gray-100">
                Original - Trabajador
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border border-black mb-2">
        <div className="bg-gray-100 border-b border-black px-2 py-1 text-[9px] font-bold uppercase tracking-wide">
          DATOS DEL EMPLEADO Y LIQUIDACIÓN
        </div>
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="p-1.5 border-r border-gray-300 align-top" style={{ width: '35%' }}>
                <span className="block text-[8px] text-gray-500 uppercase font-bold">Empleado</span>
                <span className="font-bold text-[11px]">{nombreEmpleado}</span>
              </td>
              <td className="p-1.5 border-r border-gray-300 align-top" style={{ width: '22%' }}>
                <span className="block text-[8px] text-gray-500 uppercase font-bold">CUIL</span>
                <span className="font-bold text-[11px]">{cuilEmpleado}</span>
              </td>
              {/* Bloque para mostrar ambas fechas de ingreso formateadas */}
              {usarFechaIngresoManual && (fechaIngresoReal || fechaIngresoReconocida) && (
                <td className="p-1.5 border-r border-gray-300 align-top text-[10px]" style={{ width: '28%' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-gray-500 uppercase font-bold">Ingreso:</span>
                    <span className="font-semibold">{fechaIngresoReal}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-[8px] text-gray-500 uppercase font-bold">Reconocida:</span>
                    <span className="font-semibold">{fechaIngresoReconocida}</span>
                  </div>
                </td>
              )}
              {!usarFechaIngresoManual && (
                <td className="p-1.5 border-r border-gray-300 align-top" style={{ width: '28%' }}>
                  <span className="block text-[8px] text-gray-500 uppercase font-bold">Antigüedad</span>
                  <span className="font-semibold text-[10px] text-gray-500">No aplica</span>
                </td>
              )}
              <td className="p-1.5 align-top" style={{ width: '15%' }}>
                <span className="block text-[8px] text-gray-500 uppercase font-bold">Legajo</span>
                <span className="font-bold text-[11px]">{legajo}</span>
              </td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-1.5 border-r border-gray-300 align-top">
                <span className="block text-[8px] text-gray-500 uppercase font-bold">Liquidación</span>
                <span className="font-semibold">{liquidacion?.IN_DESCRIP || 'MENSUAL'}</span>
              </td>
              <td className="p-1.5 border-r border-gray-300 align-top">
                <span className="block text-[8px] text-gray-500 uppercase font-bold">Período Abonado</span>
                <span className="font-semibold">{liquidacion?.IN_ABREVIA || '-'}</span>
              </td>
              <td className="p-1.5 align-top" colSpan={2}>
                <span className="block text-[8px] text-gray-500 uppercase font-bold">Banco / Pago</span>
                <span className="font-semibold">{String(empleado?.EM_BANCO || 'BANCO').trim()}</span>
              </td>
            </tr>
            <tr className="bg-gray-50/70">
              <td className="p-1.5 border-r border-gray-300 align-top">
                <span className="block text-[8px] text-gray-600 uppercase font-bold">Último Pago Cargas Sociales</span>
                <span className="font-medium text-[10px]">{datosDeposito?.fechaPago || '-'}</span>
              </td>
              <td className="p-1.5 border-r border-gray-300 align-top">
                <span className="block text-[8px] text-gray-600 uppercase font-bold">Período Depositado</span>
                <span className="font-medium text-[10px]">{datosDeposito?.periodoPagado || '-'}</span>
              </td>
              <td className="p-1.5 align-top" colSpan={2}>
                <span className="block text-[8px] text-gray-600 uppercase font-bold">Pagado con / Banco</span>
                <span className="font-medium text-[10px] truncate block">{datosDeposito?.banco || '-'}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border border-black min-h-[270px] flex flex-col justify-between mb-2">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="border-b border-black bg-gray-100 text-[10px]">
              <th className="p-1.5 text-center border-r border-gray-300" style={{ width: '12%' }}>Cód.</th>
              <th className="p-1.5 text-left border-r border-gray-300" style={{ width: '52%' }}>Concepto</th>
              <th className="p-1.5 text-right border-r border-gray-300" style={{ width: '18%' }}>Haberes</th>
              <th className="p-1.5 text-right" style={{ width: '18%' }}>Descuentos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-[11px]">
            {datos.haberes.map((h, i) => (
              <tr key={`h-${i}`}>
                <td className="p-1 font-mono text-center text-gray-600 border-r border-gray-200">{h.codigo}</td>
                <td className="p-1 border-r border-gray-200">
                  {h.descripcion.split('\n').map((linea, idx) => (
                    <span
                      key={idx}
                      className={idx === 1 ? "block text-[10px] font-bold mt-0.5" : "block"}
                    >
                      {linea}
                    </span>
                  ))}
                </td>
                <td className="p-1 text-right font-mono font-medium border-r border-gray-200">${fmt(h.total)}</td>
                <td className="p-1 text-right font-mono text-gray-400">-</td>
              </tr>
            ))}
            {datos.descuentos.map((d, i) => (
              <tr key={`d-${i}`}>
                <td className="p-1 font-mono text-center text-gray-600 border-r border-gray-200">{d.codigo}</td>
                <td className="p-1 border-r border-gray-200">
                  {d.descripcion.split('\n').map((linea, idx) => (
                    <span
                      key={idx}
                      className={idx === 1 ? "block text-[10px] font-bold mt-0.5" : "block"}
                    >
                      {linea}
                    </span>
                  ))}
                </td>
                <td className="p-1 text-right font-mono text-gray-400 border-r border-gray-200">-</td>
                <td className="p-1 text-right font-mono font-medium">${fmt(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <table className="w-full border border-black mb-2 bg-gray-50 text-[11px]" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className="p-2 align-middle font-bold" style={{ width: '33%' }}>
              Total Haberes: ${fmt(datos.totalHaberes)}
            </td>
            <td className="p-2 align-middle font-bold text-center" style={{ width: '33%' }}>
              Total Descuentos: ${fmt(datos.totalDescuentos)}
            </td>
            <td className="p-2 align-middle text-right" style={{ width: '34%' }}>
              <span className="inline-block bg-black text-white px-2.5 py-1 rounded font-black text-xs">
                Neto a Percibir: ${fmt(datos.netoAPercibir)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border border-black p-2 mb-2 bg-gray-50 text-[10px]">
        Son: <span className="font-bold">{letrasFormateadas}</span>
      </div>

      <div className="border border-black p-2.5 mb-3">
        <div className="text-[9px] font-bold uppercase border-b border-gray-300 pb-1 mb-1.5">
          DETALLE POR CATEGORÍA (CARGAS SOCIALES)
        </div>
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td className="align-middle space-y-0.5 text-[10px]" style={{ width: '65%' }}>
                <div>
                  <span className="font-bold">Seguridad Social:</span> Total ${fmt(datos.cargasSociales.seguridadSocial.total)}
                  <span className="text-gray-600 ml-2">(Trab: ${fmt(datos.cargasSociales.seguridadSocial.trabajador)} | Empl: ${fmt(datos.cargasSociales.seguridadSocial.empleador)})</span>
                </div>
                <div>
                  <span className="font-bold">Obra Social:</span> Total ${fmt(datos.cargasSociales.obraSocial.total)}
                  <span className="text-gray-600 ml-2">(Trab: ${fmt(datos.cargasSociales.obraSocial.trabajador)} | Empl: ${fmt(datos.cargasSociales.obraSocial.empleador)})</span>
                </div>
                <div>
                  <span className="font-bold">INSSJP (PAMI):</span> Total ${fmt(datos.cargasSociales.inssjp.total)}
                  <span className="text-gray-600 ml-2">(Trab: ${fmt(datos.cargasSociales.inssjp.trabajador)} | Empl: ${fmt(datos.cargasSociales.inssjp.empleador)})</span>
                </div>
                <div>
                  <span className="font-bold">ART:</span> Total ${fmt(datos.cargasSociales.art.total)}
                </div>
                <div>
                  <span className="font-bold">SCVO:</span> Total ${fmt(datos.cargasSociales.scvo.total)}
                </div>
                <div>
                  <span className="font-bold">SINDICATO CUOTA 2%:</span> Total ${fmt(cuotaSindicato)}
                </div>
              </td>
              <td className="text-center align-middle border-l border-gray-300 pl-2 py-1" style={{ width: '35%' }}>
                <GraficoCargasSVG pSegSoc={pSegSoc} pOS={pOS} pINSSJP={pINSSJP} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="w-full mt-5" style={{ tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td className="text-center align-top p-2" style={{ width: '50%' }}>
              <div className="border-t border-black pt-1 mx-auto w-48 font-bold text-[10px]">
                Firma del Empleador
              </div>
            </td>
            <td className="text-center align-top p-2" style={{ width: '50%' }}>
              <div className="border-t border-black pt-1 mx-auto w-48 font-bold text-[10px]">
                Firma del Empleado
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}