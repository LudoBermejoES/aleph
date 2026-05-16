const SPANISH_MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export function toSpanishDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return `${day} de ${SPANISH_MONTHS[month - 1]} de ${year}`
}
