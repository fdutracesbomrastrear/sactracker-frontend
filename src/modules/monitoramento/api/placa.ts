/** Extrai placa Mercosul ou antiga de um texto livre. */
export function extrairPlacaDoTexto(texto: string): string | null {
  const m = texto.toUpperCase().match(/\b([A-Z]{3}[0-9][A-Z0-9][0-9]{2})\b/);
  if (m) return m[1];
  const m2 = texto.toUpperCase().match(/\b([A-Z]{3}[0-9]{4})\b/);
  return m2 ? m2[1] : null;
}
