/**
 * @file backend/src/utils/zootecniaUtils.ts
 * @description Módulo matemático de fórmulas zootécnicas requeridas por la Enmienda.
 */

/**
 * Calcula el peso estimado en kilogramos usando la fórmula basada en medidas corporales.
 * 
 * @param perimetro Perímetro Torácico (PT) en centímetros.
 * @param longitud Longitud Corporal (LC) en centímetros.
 * @returns Peso estimado en kg.
 */
export function calcularPesoEstimado(perimetro: number, longitud: number): number {
  if (perimetro <= 0 || longitud <= 0) return 0;
  return (perimetro * perimetro * longitud) / 10838;
}

/**
 * Calcula el peso ajustado a los 205 días (peso de destete estándar).
 * Fórmula: [(Peso Real - Peso al Nacer) / Edad al destete en días] * 205 + Peso al Nacer
 * 
 * @param pesoReal Peso medido en la fecha de destete.
 * @param pesoNacer Peso al nacer.
 * @param fechaNacimiento Fecha de nacimiento.
 * @param fechaPesaje Fecha en la que se realizó el destete.
 * @returns Peso ajustado a 205 días en kg, redondeado a 2 decimales.
 */
export function calcularPesoDesteteAjustado(
  pesoReal: number,
  pesoNacer: number,
  fechaNacimiento: Date,
  fechaPesaje: Date
): number | null {
  const diffTime = Math.abs(fechaPesaje.getTime() - fechaNacimiento.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return null;

  const gananciaDiaria = (pesoReal - pesoNacer) / diffDays;
  const pesoAjustado = (gananciaDiaria * 205) + pesoNacer;

  return parseFloat(pesoAjustado.toFixed(2));
}

/**
 * Calcula el peso ajustado a los 365 días (peso al año).
 * Fórmula: [(Peso Real - Peso al Nacer) / Edad en días] * 365 + Peso al Nacer
 * 
 * @param pesoReal Peso medido a los ~365 días.
 * @param pesoNacer Peso al nacer.
 * @param fechaNacimiento Fecha de nacimiento.
 * @param fechaPesaje Fecha en la que se realizó el pesaje al año.
 * @returns Peso ajustado a 365 días en kg, redondeado a 2 decimales.
 */
export function calcularPesoAnioAjustado(
  pesoReal: number,
  pesoNacer: number,
  fechaNacimiento: Date,
  fechaPesaje: Date
): number | null {
  const diffTime = Math.abs(fechaPesaje.getTime() - fechaNacimiento.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return null;

  const gananciaDiaria = (pesoReal - pesoNacer) / diffDays;
  const pesoAjustado = (gananciaDiaria * 365) + pesoNacer;

  return parseFloat(pesoAjustado.toFixed(2));
}
