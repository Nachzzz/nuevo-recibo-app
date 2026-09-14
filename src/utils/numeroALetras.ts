export function numeroALetras(monto: number): string {
  const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
  const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  function leerGrupo(n: number): string {
    let salida = ''
    if (n === 100) return 'cien'
    const c = Math.floor(n / 100)
    const d = Math.floor((n % 100) / 10)
    const u = n % 10

    if (c > 0) salida += centenas[c] + ' '

    if (d === 1 && u > 0) {
      salida += especiales[u]
    } else if (d === 2 && u > 0) {
      salida += 'veinti' + unidades[u]
    } else {
      if (d > 0) salida += decenas[d]
      if (d > 0 && u > 0) salida += ' y '
      if (u > 0) salida += unidades[u]
    }
    return salida.trim()
  }

  const partes = monto.toFixed(2).split('.')
  let entero = parseInt(partes[0], 10)
  const centavos = partes[1]

  if (entero === 0) return `cero pesos con ${centavos}/100`

  let texto = ''
  const millones = Math.floor(entero / 1000000)
  entero %= 1000000
  const miles = Math.floor(entero / 1000)
  const resto = entero % 1000

  if (millones === 1) texto += 'un millón '
  else if (millones > 1) texto += `${leerGrupo(millones)} millones `

  if (miles === 1) texto += 'mil '
  else if (miles > 1) texto += `${leerGrupo(miles)} mil `

  if (resto > 0) texto += `${leerGrupo(resto)} `

  return `${texto.trim()} pesos con ${centavos}/100`.toLowerCase()
}