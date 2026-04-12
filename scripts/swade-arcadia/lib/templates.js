// Entity type definitions for the Arcadia SWADE campaign

export const ENTITY_TYPES = [
  { slug: 'swade-ventaja', name: 'Ventaja', icon: 'star' },
  { slug: 'swade-desventaja', name: 'Desventaja', icon: 'minus-circle' },
  { slug: 'swade-rasgo', name: 'Rasgo', icon: 'activity' },
  { slug: 'swade-superpoder', name: 'Superpoder', icon: 'zap' },
  { slug: 'swade-armadura', name: 'Armadura', icon: 'shield' },
  { slug: 'swade-arma', name: 'Arma', icon: 'sword' },
  { slug: 'swade-equipo', name: 'Equipo', icon: 'package' },
  { slug: 'swade-escudo', name: 'Escudo', icon: 'shield-off' },
  { slug: 'swade-vehiculo', name: 'Vehiculo', icon: 'truck' },
  { slug: 'swade-base', name: 'Base de Operaciones', icon: 'home' },
  { slug: 'swade-raza', name: 'Raza', icon: 'users' },
]

// Template fields for each entity type.
// Each entry: { entityTypeSlug, templateName, fields }
// Field shape: { key, label, type, options? }
export const ENTITY_TEMPLATES = [
  {
    entityTypeSlug: 'swade-ventaja',
    templateName: 'Ventaja',
    fields: [
      { key: 'requisitos', label: 'Requisitos', type: 'text' },
      { key: 'categoria', label: 'Categoria', type: 'text' },
      { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
    ],
  },
  {
    entityTypeSlug: 'swade-desventaja',
    templateName: 'Desventaja',
    fields: [
      {
        key: 'tipo',
        label: 'Tipo',
        type: 'select',
        options: ['Mayor', 'Menor', 'Mayor o Menor'],
      },
      { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
    ],
  },
  {
    entityTypeSlug: 'swade-rasgo',
    templateName: 'Rasgo',
    fields: [
      {
        key: 'atributo_vinculado',
        label: 'Atributo Vinculado',
        type: 'select',
        options: ['Agilidad', 'Astucia', 'Espiritu', 'Fuerza', 'Vigor'],
      },
      { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
    ],
  },
  {
    entityTypeSlug: 'swade-superpoder',
    templateName: 'Superpoder',
    fields: [
      { key: 'coste', label: 'Coste', type: 'text' },
      { key: 'ornamentos', label: 'Ornamentos', type: 'textarea' },
      { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
      { key: 'modificadores', label: 'Modificadores', type: 'textarea' },
    ],
  },
  {
    entityTypeSlug: 'swade-armadura',
    templateName: 'Armadura',
    fields: [
      { key: 'proteccion', label: 'Proteccion', type: 'number' },
      { key: 'localizaciones', label: 'Localizaciones', type: 'text' },
      { key: 'peso', label: 'Peso', type: 'number' },
      { key: 'coste', label: 'Coste', type: 'number' },
      {
        key: 'fuerza_minima',
        label: 'Fuerza Minima',
        type: 'select',
        options: ['d4', 'd6', 'd8', 'd10', 'd12', '-'],
      },
      { key: 'notas', label: 'Notas', type: 'text' },
    ],
  },
  {
    entityTypeSlug: 'swade-arma',
    templateName: 'Arma',
    fields: [
      { key: 'dano', label: 'Dano', type: 'text' },
      {
        key: 'fuerza_minima',
        label: 'Fuerza Minima',
        type: 'select',
        options: ['d4', 'd6', 'd8', 'd10', 'd12', '-'],
      },
      { key: 'peso', label: 'Peso', type: 'number' },
      { key: 'coste', label: 'Coste', type: 'number' },
      { key: 'notas', label: 'Notas', type: 'text' },
      { key: 'categoria', label: 'Categoria', type: 'text' },
    ],
  },
  {
    entityTypeSlug: 'swade-equipo',
    templateName: 'Equipo',
    fields: [
      { key: 'peso', label: 'Peso', type: 'number' },
      { key: 'coste', label: 'Coste', type: 'number' },
      { key: 'notas', label: 'Notas', type: 'text' },
      { key: 'categoria', label: 'Categoria', type: 'text' },
    ],
  },
  {
    entityTypeSlug: 'swade-escudo',
    templateName: 'Escudo',
    fields: [
      { key: 'bonus_parada', label: 'Bonus Parada', type: 'number' },
      { key: 'cobertura', label: 'Cobertura', type: 'text' },
      { key: 'peso', label: 'Peso', type: 'number' },
      { key: 'coste', label: 'Coste', type: 'number' },
    ],
  },
  {
    entityTypeSlug: 'swade-vehiculo',
    templateName: 'Vehiculo',
    fields: [
      { key: 'tamanio', label: 'Tamanio', type: 'number' },
      { key: 'manejo', label: 'Manejo', type: 'text' },
      { key: 'velocidad_max', label: 'Velocidad Max', type: 'number' },
      { key: 'dureza', label: 'Dureza', type: 'text' },
      { key: 'tripulacion', label: 'Tripulacion', type: 'text' },
      { key: 'coste', label: 'Coste', type: 'number' },
      { key: 'categoria', label: 'Categoria', type: 'text' },
    ],
  },
  {
    entityTypeSlug: 'swade-base',
    templateName: 'Base de Operaciones',
    fields: [
      { key: 'coste_por_nivel', label: 'Coste por Nivel', type: 'number' },
      { key: 'dureza', label: 'Dureza', type: 'number' },
      { key: 'modificaciones', label: 'Modificaciones Disponibles', type: 'textarea' },
    ],
  },
  {
    entityTypeSlug: 'swade-raza',
    templateName: 'Raza',
    fields: [
      { key: 'habilidades_raciales', label: 'Habilidades Raciales', type: 'textarea' },
      { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
    ],
  },
]

const DADO_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12']

// Character template: Personaje SWADE (PC)
export const PERSONAJE_SWADE_TEMPLATE = {
  name: 'Personaje SWADE',
  entityTypeSlug: 'character',
  isDefault: false,
  sections: [
    {
      name: 'Datos Principales',
      fields: [
        {
          key: 'rango',
          label: 'Rango',
          type: 'select',
          options: ['Novato', 'Avanzado', 'Veterano', 'Heroico', 'Legendario'],
        },
        { key: 'raza', label: 'Raza', type: 'text' },
        { key: 'concepto', label: 'Concepto', type: 'text' },
        { key: 'puntos_poder_super', label: 'SPP Disponibles', type: 'number' },
      ],
    },
    {
      name: 'Atributos',
      fields: [
        { key: 'agilidad', label: 'Agilidad', type: 'select', options: DADO_OPTIONS },
        { key: 'astucia', label: 'Astucia', type: 'select', options: DADO_OPTIONS },
        { key: 'espiritu', label: 'Espiritu', type: 'select', options: DADO_OPTIONS },
        { key: 'fuerza', label: 'Fuerza', type: 'select', options: DADO_OPTIONS },
        { key: 'vigor', label: 'Vigor', type: 'select', options: DADO_OPTIONS },
      ],
    },
    {
      name: 'Derivadas',
      fields: [
        { key: 'ritmo', label: 'Ritmo', type: 'number' },
        { key: 'parada', label: 'Parada', type: 'number' },
        { key: 'temple', label: 'Temple', type: 'number' },
        { key: 'carga_max', label: 'Carga Maxima', type: 'number' },
      ],
    },
    {
      name: 'Heridas y Fatiga',
      fields: [
        { key: 'heridas', label: 'Heridas', type: 'number' },
        { key: 'fatiga', label: 'Fatiga', type: 'number' },
        { key: 'heridas_incapacitado', label: 'Incapacitado', type: 'checkbox' },
      ],
    },
    {
      name: 'Rasgos / Habilidades',
      fields: [{ key: 'habilidades', label: 'Habilidades', type: 'textarea' }],
    },
    {
      name: 'Ventajas',
      fields: [{ key: 'ventajas', label: 'Ventajas', type: 'textarea' }],
    },
    {
      name: 'Desventajas',
      fields: [{ key: 'desventajas', label: 'Desventajas', type: 'textarea' }],
    },
    {
      name: 'Superpoderes',
      fields: [
        { key: 'puntos_poder_gastados', label: 'SPP Gastados', type: 'number' },
        { key: 'superpoderes', label: 'Superpoderes', type: 'textarea' },
        { key: 'puntos_de_poder', label: 'Puntos de Poder (actuales)', type: 'number' },
      ],
    },
    {
      name: 'Equipo',
      fields: [
        { key: 'armas', label: 'Armas', type: 'textarea' },
        { key: 'armadura', label: 'Armadura', type: 'text' },
        { key: 'equipo', label: 'Equipo', type: 'textarea' },
        { key: 'dinero', label: 'Dinero', type: 'text' },
      ],
    },
    {
      name: 'Notas',
      fields: [
        { key: 'trasfondo', label: 'Trasfondo', type: 'textarea' },
        { key: 'notas', label: 'Notas', type: 'textarea' },
      ],
    },
  ],
}

// Character template: Criatura SWADE (NPC/bestiary)
export const CRIATURA_SWADE_TEMPLATE = {
  name: 'Criatura SWADE',
  entityTypeSlug: 'character',
  isDefault: false,
  sections: [
    {
      name: 'Identidad',
      fields: [
        { key: 'tipo', label: 'Tipo', type: 'text' },
        { key: 'comodin', label: 'Es Comodin', type: 'checkbox' },
        {
          key: 'rango',
          label: 'Rango',
          type: 'select',
          options: ['Salvaje', 'Avanzado', 'Veterano', 'Heroico', 'Legendario'],
        },
        {
          key: 'rareza',
          label: 'Rareza',
          type: 'select',
          options: ['Comun', 'Infrecuente', 'Raro', 'Unico'],
        },
      ],
    },
    {
      name: 'Atributos',
      fields: [
        { key: 'agilidad', label: 'Agilidad', type: 'select', options: DADO_OPTIONS },
        { key: 'astucia', label: 'Astucia', type: 'select', options: DADO_OPTIONS },
        { key: 'espiritu', label: 'Espiritu', type: 'select', options: DADO_OPTIONS },
        { key: 'fuerza', label: 'Fuerza', type: 'select', options: DADO_OPTIONS },
        { key: 'vigor', label: 'Vigor', type: 'select', options: DADO_OPTIONS },
      ],
    },
    {
      name: 'Derivadas',
      fields: [
        { key: 'ritmo', label: 'Ritmo', type: 'number' },
        { key: 'parada', label: 'Parada', type: 'number' },
        { key: 'temple', label: 'Temple', type: 'number' },
      ],
    },
    {
      name: 'Habilidades',
      fields: [{ key: 'habilidades', label: 'Habilidades', type: 'textarea' }],
    },
    {
      name: 'Ventajas y Habilidades Especiales',
      fields: [
        { key: 'ventajas', label: 'Ventajas', type: 'textarea' },
        { key: 'habilidades_especiales', label: 'Habilidades Especiales', type: 'textarea' },
      ],
    },
    {
      name: 'Equipo',
      fields: [
        { key: 'armas', label: 'Armas', type: 'textarea' },
        { key: 'armadura', label: 'Armadura', type: 'text' },
      ],
    },
    {
      name: 'Superpoderes',
      fields: [
        { key: 'puntos_poder_super', label: 'SPP', type: 'number' },
        { key: 'superpoderes', label: 'Superpoderes', type: 'textarea' },
      ],
    },
    {
      name: 'Fuente',
      fields: [
        { key: 'libro_fuente', label: 'Libro Fuente', type: 'text' },
        { key: 'pagina', label: 'Pagina', type: 'text' },
        { key: 'xp_otorgado', label: 'XP Otorgado', type: 'number' },
        { key: 'notas', label: 'Notas', type: 'textarea' },
      ],
    },
  ],
}
