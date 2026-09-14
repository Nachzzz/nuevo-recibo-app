export interface ReciboArca {
  cuil: string;
  haberes: { codigo: string | number; total: number }[];
  descuentos: { codigo: string | number; total: number }[];
}

export function generarArchivoARCA(
  cuitEmpresa: string,
  periodo: string, // Formato: "202608"
  fechaPago: string, // Formato: "20260904" (YYYYMMDD)
  recibos: ReciboArca[]
): string {
  const lineas: string[] = [];

  // 1. Registro 01 - Cabecera (Longitud: 35)
  const cuitLimpio = String(cuitEmpresa).replace(/\D/g, '');
  const cantEmpleados = String(recibos.length).padStart(7, '0');
  lineas.push(`01${cuitLimpio}SJ${periodo}M000013${cantEmpleados}`);

  // Helper para Registro 03 - Conceptos (Longitud obligatoria: 51)
  const crearReg03 = (cuil: string, cod: string | number, importe: number, tipo: 'C' | 'D') => {
    const codStr = String(cod).padEnd(10, ' ');
    const unidades = '00000 '; // 5 ceros + 1 espacio
    const impCents = Math.round(importe * 100).toString().padStart(15, '0');
    return `03${cuil}${codStr}${unidades}${impCents}${tipo}      `;
  };

  // 2. Iterar Empleados
  recibos.forEach(recibo => {
    const cuilEmp = String(recibo.cuil).replace(/\D/g, '');

    // Registro 02 - Datos empleado (Longitud obligatoria: 115)
    // 02(2) + CUIL(11) + Espacios(84) + Marca(3) + Fecha(8) + FormaPago(1) + Espacios(6)
    const espacios84 = ' '.repeat(84);
    const formaPago = '1      '; // 1 + 6 espacios = 7 caracteres
    lineas.push(`02${cuilEmp}${espacios84}000${fechaPago}${formaPago}`);

    // Registro 03 - Haberes y Descuentos
    recibo.haberes.forEach(h => {
      if (h.total > 0) lineas.push(crearReg03(cuilEmp, h.codigo, h.total, 'C'));
    });
    recibo.descuentos.forEach(d => {
      if (d.total > 0) lineas.push(crearReg03(cuilEmp, d.codigo, d.total, 'D'));
    });

    // Registro 04 - Bases imponibles
    // ARCA exige EXACTAMENTE 370 caracteres. Usamos padEnd(370, '0') para rellenar automáticamente.
    const baseReg04 = `04${cuilEmp}100110100101049008007501010000000030000000000000108803`;
    lineas.push(baseReg04.padEnd(370, '0'));
  });

  // Retornamos unido por salto de línea Windows (CRLF), obligatorio en ARCA
  return lineas.join('\r\n');
}

// Función web nativa para descargar el archivo sin usar dependencias extra
export const descargarTxtLSD = (contenido: string, nombreArchivo: string = 'librosueldos.txt') => {
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};