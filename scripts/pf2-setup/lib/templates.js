/**
 * scripts/pf2-setup/lib/templates.js
 *
 * Template field definitions for all PF2e entity types and character templates.
 */

// ---------------------------------------------------------------------------
// Helper: section divider label field
// ---------------------------------------------------------------------------
function section(name) {
  return {
    key: `_section_${name.toLowerCase().replace(/\s+/g, '_')}`,
    label: `── ${name} ──`,
    fieldType: 'text',
  }
}

// ---------------------------------------------------------------------------
// 5.1 Spell fields
// ---------------------------------------------------------------------------
export const SPELL_FIELDS = [
  { key: 'level', label: 'Nivel', fieldType: 'number', required: true },
  { key: 'is_cantrip', label: 'Es Truco', fieldType: 'checkbox' },
  { key: 'traditions', label: 'Tradiciones', fieldType: 'text', required: true },
  { key: 'actions', label: 'Acciones', fieldType: 'text' },
  { key: 'range', label: 'Alcance', fieldType: 'text' },
  { key: 'targets', label: 'Objetivos', fieldType: 'text' },
  { key: 'area', label: 'Area', fieldType: 'text' },
  { key: 'duration', label: 'Duracion', fieldType: 'text' },
  { key: 'saving_throw', label: 'Salvacion', fieldType: 'text' },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },
  { key: 'description', label: 'Descripcion', fieldType: 'textarea', required: true },
  { key: 'heightened', label: 'Potenciado', fieldType: 'textarea' },
]

// ---------------------------------------------------------------------------
// 5.2 Class fields
// ---------------------------------------------------------------------------
const PROF_OPTIONS = ['No entrenado', 'Entrenado', 'Experto', 'Maestro', 'Legendario']

export const CLASS_FIELDS = [
  {
    key: 'complexity',
    label: 'Complejidad',
    fieldType: 'select',
    options: ['Sencilla', 'Media', 'Compleja'],
  },
  { key: 'hp_per_level', label: 'PG por Nivel', fieldType: 'number', required: true },
  { key: 'key_ability', label: 'Atributo Clave', fieldType: 'text', required: true },
  { key: 'perception_prof', label: 'Percepcion', fieldType: 'select', options: PROF_OPTIONS },
  { key: 'fortitude_prof', label: 'Fortaleza', fieldType: 'select', options: PROF_OPTIONS },
  { key: 'reflex_prof', label: 'Reflejos', fieldType: 'select', options: PROF_OPTIONS },
  { key: 'will_prof', label: 'Voluntad', fieldType: 'select', options: PROF_OPTIONS },
  { key: 'trained_skills', label: 'Habilidades con Entrenamiento', fieldType: 'text' },
  { key: 'extra_skills', label: 'Habilidades Adicionales', fieldType: 'text' },
  { key: 'class_features_summary', label: 'Resumen de Caracteristicas', fieldType: 'textarea' },
]

// ---------------------------------------------------------------------------
// 5.3 Ancestry fields
// ---------------------------------------------------------------------------
export const ANCESTRY_FIELDS = [
  { key: 'hp', label: 'Puntos de Golpe', fieldType: 'number', required: true },
  { key: 'size', label: 'Tamanio', fieldType: 'select', options: ['Pequeno', 'Mediano', 'Grande'] },
  { key: 'speed', label: 'Velocidad (pies)', fieldType: 'number', required: true },
  { key: 'attribute_boosts', label: 'Mejoras de Atributo', fieldType: 'text', required: true },
  { key: 'attribute_flaw', label: 'Defecto de Atributo', fieldType: 'text' },
  { key: 'languages', label: 'Idiomas', fieldType: 'text', required: true },
  { key: 'traits', label: 'Rasgos', fieldType: 'text', required: true },
  { key: 'special_abilities', label: 'Habilidades Especiales', fieldType: 'textarea' },
]

// ---------------------------------------------------------------------------
// 5.4 Heritage fields
// ---------------------------------------------------------------------------
export const HERITAGE_FIELDS = [
  { key: 'ancestry', label: 'Ascendencia', fieldType: 'text', required: true },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },
  { key: 'benefit', label: 'Beneficio', fieldType: 'textarea', required: true },
]

// ---------------------------------------------------------------------------
// 5.5 Background fields
// ---------------------------------------------------------------------------
export const BACKGROUND_FIELDS = [
  { key: 'attribute_boosts', label: 'Mejoras de Atributo', fieldType: 'text', required: true },
  { key: 'skill_training', label: 'Entrenamiento en Habilidad', fieldType: 'text', required: true },
  { key: 'skill_feat', label: 'Dote de Habilidad', fieldType: 'text', required: true },
  { key: 'lore_skill', label: 'Habilidad de Saber', fieldType: 'text' },
  { key: 'special', label: 'Especial', fieldType: 'textarea' },
]

// ---------------------------------------------------------------------------
// 5.6 Feat fields
// ---------------------------------------------------------------------------
export const FEAT_FIELDS = [
  { key: 'level', label: 'Nivel', fieldType: 'number', required: true },
  {
    key: 'category',
    label: 'Categoria',
    fieldType: 'select',
    options: ['Clase', 'Ascendencia', 'Habilidad', 'General', 'Arquetipo'],
  },
  { key: 'class_or_ancestry', label: 'Clase o Ascendencia', fieldType: 'text' },
  { key: 'action_type', label: 'Tipo de Accion', fieldType: 'text' },
  { key: 'prerequisites', label: 'Prerequisitos', fieldType: 'text' },
  { key: 'traits', label: 'Rasgos', fieldType: 'text', required: true },
  { key: 'benefit', label: 'Beneficio', fieldType: 'textarea', required: true },
  { key: 'special', label: 'Especial', fieldType: 'textarea' },
]

// ---------------------------------------------------------------------------
// 5.7 Action fields
// ---------------------------------------------------------------------------
export const ACTION_FIELDS = [
  {
    key: 'action_type',
    label: 'Tipo de Accion',
    fieldType: 'select',
    options: ['◆', '◆◆', '◆◆◆', '↺', '◇', 'Variable'],
  },
  {
    key: 'category',
    label: 'Categoria',
    fieldType: 'select',
    options: ['Basica', 'Especialidad', 'Exploracion', 'Tiempo libre'],
  },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },
  { key: 'trigger', label: 'Desencadenante', fieldType: 'text' },
  { key: 'requirements', label: 'Requisitos', fieldType: 'text' },
  { key: 'critical_success', label: 'Exito Critico', fieldType: 'textarea' },
  { key: 'success', label: 'Exito', fieldType: 'textarea' },
  { key: 'failure', label: 'Fallo', fieldType: 'textarea' },
  { key: 'critical_failure', label: 'Fallo Critico', fieldType: 'textarea' },
]

// ---------------------------------------------------------------------------
// 5.8 Weapon fields
// ---------------------------------------------------------------------------
export const WEAPON_FIELDS = [
  { key: 'price', label: 'Precio', fieldType: 'text' },
  { key: 'damage', label: 'Dano', fieldType: 'text', required: true },
  { key: 'hands', label: 'Manos', fieldType: 'select', options: ['1', '1+', '2'] },
  { key: 'bulk', label: 'Bulto', fieldType: 'text', required: true },
  { key: 'group', label: 'Grupo', fieldType: 'text', required: true },
  { key: 'category', label: 'Categoria', fieldType: 'text', required: true },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },
  { key: 'is_ranged', label: 'Es a Distancia', fieldType: 'checkbox' },
  { key: 'range', label: 'Alcance', fieldType: 'text' },
  { key: 'reload', label: 'Recarga', fieldType: 'text' },
]

// ---------------------------------------------------------------------------
// 5.9 Armor fields
// ---------------------------------------------------------------------------
export const ARMOR_FIELDS = [
  { key: 'price', label: 'Precio', fieldType: 'text' },
  { key: 'ac_bonus', label: 'Bono de CA', fieldType: 'text', required: true },
  { key: 'dex_cap', label: 'Limite de DES', fieldType: 'text', required: true },
  { key: 'check_penalty', label: 'Penalizacion a Pruebas', fieldType: 'text' },
  { key: 'speed_penalty', label: 'Penalizacion a Velocidad', fieldType: 'text' },
  { key: 'strength_req', label: 'Requisito de Fuerza', fieldType: 'text' },
  { key: 'bulk', label: 'Bulto', fieldType: 'text', required: true },
  { key: 'group', label: 'Grupo', fieldType: 'text', required: true },
  { key: 'category', label: 'Categoria', fieldType: 'text', required: true },
  {
    key: 'weight_class',
    label: 'Tipo',
    fieldType: 'select',
    options: ['Ligera', 'Intermedia', 'Pesada', 'Sin armadura'],
  },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },
]

// ---------------------------------------------------------------------------
// 5.10 Shield fields
// ---------------------------------------------------------------------------
export const SHIELD_FIELDS = [
  { key: 'price', label: 'Precio', fieldType: 'text' },
  { key: 'ac_bonus', label: 'Bono de CA', fieldType: 'text', required: true },
  { key: 'hardness', label: 'Dureza', fieldType: 'number', required: true },
  { key: 'hp', label: 'Puntos de Golpe', fieldType: 'number', required: true },
  { key: 'bt', label: 'Umbral de Rotura', fieldType: 'number', required: true },
  { key: 'bulk', label: 'Bulto', fieldType: 'text', required: true },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },
]

// ---------------------------------------------------------------------------
// 5.11 Item fields
// ---------------------------------------------------------------------------
export const ITEM_FIELDS = [
  { key: 'price', label: 'Precio', fieldType: 'text' },
  { key: 'bulk', label: 'Bulto', fieldType: 'text' },
  { key: 'hands', label: 'Manos', fieldType: 'text' },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },
  { key: 'item_type', label: 'Tipo de Objeto', fieldType: 'text' },
  { key: 'usage', label: 'Uso', fieldType: 'text' },
]

// ---------------------------------------------------------------------------
// 5.12 Trait fields
// ---------------------------------------------------------------------------
export const TRAIT_FIELDS = [{ key: 'trait_type', label: 'Tipo de Rasgo', fieldType: 'text' }]

// ---------------------------------------------------------------------------
// 5.13 Condition fields — description only
// ---------------------------------------------------------------------------
export const CONDITION_FIELDS = []

// ---------------------------------------------------------------------------
// 5.14 Archetype fields
// ---------------------------------------------------------------------------
export const ARCHETYPE_FIELDS = [
  { key: 'dedication_feat', label: 'Dote de Dedicacion', fieldType: 'text', required: true },
  { key: 'class_traits', label: 'Rasgos de Clase', fieldType: 'text' },
  {
    key: 'complexity',
    label: 'Complejidad',
    fieldType: 'select',
    options: ['Sencilla', 'Media', 'Compleja'],
  },
]

// ---------------------------------------------------------------------------
// Map entity type slug → field array
// ---------------------------------------------------------------------------
export const ENTITY_TYPE_TEMPLATES = {
  'pf2-conjuro': SPELL_FIELDS,
  'pf2-clase': CLASS_FIELDS,
  'pf2-ascendencia': ANCESTRY_FIELDS,
  'pf2-herencia': HERITAGE_FIELDS,
  'pf2-trasfondo': BACKGROUND_FIELDS,
  'pf2-dote': FEAT_FIELDS,
  'pf2-accion': ACTION_FIELDS,
  'pf2-arma': WEAPON_FIELDS,
  'pf2-armadura': ARMOR_FIELDS,
  'pf2-escudo': SHIELD_FIELDS,
  'pf2-objeto': ITEM_FIELDS,
  'pf2-rasgo': TRAIT_FIELDS,
  'pf2-condicion': CONDITION_FIELDS,
  'pf2-arquetipo': ARCHETYPE_FIELDS,
}

// ---------------------------------------------------------------------------
// Tasks 3.1–3.11: PC character template fields
// ---------------------------------------------------------------------------
export const PC_CHARACTER_FIELDS = [
  // 3.1 Datos Principales
  section('Datos Principales'),
  { key: 'level', label: 'Nivel', fieldType: 'number', required: true },
  { key: 'ancestry', label: 'Ascendencia', fieldType: 'text' },
  { key: 'heritage', label: 'Herencia', fieldType: 'text' },
  { key: 'background', label: 'Trasfondo', fieldType: 'text' },
  { key: 'class', label: 'Clase', fieldType: 'text', required: true },
  { key: 'subclass', label: 'Subclase / Patente', fieldType: 'text' },

  // 3.2 Puntuaciones de Atributo
  section('Puntuaciones de Atributo'),
  { key: 'str', label: 'Fuerza', fieldType: 'number', required: true },
  { key: 'dex', label: 'Destreza', fieldType: 'number', required: true },
  { key: 'con', label: 'Constitucion', fieldType: 'number', required: true },
  { key: 'int', label: 'Inteligencia', fieldType: 'number', required: true },
  { key: 'wis', label: 'Sabiduria', fieldType: 'number', required: true },
  { key: 'cha', label: 'Carisma', fieldType: 'number', required: true },

  // 3.3 Defensas
  section('Defensas'),
  { key: 'max_hp', label: 'PG Maximos', fieldType: 'number', required: true },
  { key: 'current_hp', label: 'PG Actuales', fieldType: 'number' },
  { key: 'ac', label: 'Clase de Armadura', fieldType: 'number', required: true },
  { key: 'fortitude', label: 'Fortaleza', fieldType: 'text' },
  { key: 'reflex', label: 'Reflejos', fieldType: 'text' },
  { key: 'will', label: 'Voluntad', fieldType: 'text' },
  { key: 'perception', label: 'Percepcion', fieldType: 'text' },

  // 3.4 Ataque
  section('Ataque'),
  { key: 'class_dc', label: 'CD de Clase', fieldType: 'number' },
  { key: 'spell_attack', label: 'Ataque de Conjuro', fieldType: 'number' },
  { key: 'spell_dc', label: 'CD de Conjuro', fieldType: 'number' },

  // 3.5 Movimiento
  section('Movimiento'),
  { key: 'speed', label: 'Velocidad (pies)', fieldType: 'number', required: true },
  { key: 'fly_speed', label: 'Velocidad de Vuelo', fieldType: 'number' },
  { key: 'swim_speed', label: 'Velocidad de Natacion', fieldType: 'number' },
  { key: 'climb_speed', label: 'Velocidad de Escalada', fieldType: 'number' },
  { key: 'burrow_speed', label: 'Velocidad de Excavar', fieldType: 'number' },

  // 3.6 Habilidades
  section('Habilidades'),
  { key: 'acrobatics', label: 'Acrobacias', fieldType: 'text' },
  { key: 'arcana', label: 'Arcanos', fieldType: 'text' },
  { key: 'athletics', label: 'Atletismo', fieldType: 'text' },
  { key: 'crafting', label: 'Artesania', fieldType: 'text' },
  { key: 'deception', label: 'Engano', fieldType: 'text' },
  { key: 'diplomacy', label: 'Diplomacia', fieldType: 'text' },
  { key: 'intimidation', label: 'Intimidacion', fieldType: 'text' },
  { key: 'lore', label: 'Saber', fieldType: 'text' },
  { key: 'medicine', label: 'Medicina', fieldType: 'text' },
  { key: 'nature', label: 'Naturaleza', fieldType: 'text' },
  { key: 'occultism', label: 'Ocultismo', fieldType: 'text' },
  { key: 'performance', label: 'Interpretacion', fieldType: 'text' },
  { key: 'religion', label: 'Religion', fieldType: 'text' },
  { key: 'society', label: 'Sociedad', fieldType: 'text' },
  { key: 'stealth', label: 'Sigilo', fieldType: 'text' },
  { key: 'survival', label: 'Supervivencia', fieldType: 'text' },
  { key: 'thievery', label: 'Latrocinio', fieldType: 'text' },

  // 3.7 Dotes y Caracteristicas
  section('Dotes y Caracteristicas'),
  { key: 'ancestry_feats', label: 'Dotes de Ascendencia', fieldType: 'textarea' },
  { key: 'class_feats', label: 'Dotes de Clase', fieldType: 'textarea' },
  { key: 'skill_feats', label: 'Dotes de Habilidad', fieldType: 'textarea' },
  { key: 'general_feats', label: 'Dotes Generales', fieldType: 'textarea' },
  { key: 'class_features', label: 'Caracteristicas de Clase', fieldType: 'textarea' },

  // 3.8 Lanzamiento de Conjuros
  section('Lanzamiento de Conjuros'),
  {
    key: 'tradition',
    label: 'Tradicion',
    fieldType: 'select',
    options: ['Arcana', 'Divina', 'Ocultista', 'Primigenia', '—'],
  },
  {
    key: 'casting_type',
    label: 'Tipo de Lanzamiento',
    fieldType: 'select',
    options: ['Preparados', 'Espontaneos', '—'],
  },
  { key: 'cantrips', label: 'Trucos', fieldType: 'number' },
  { key: 'spell_slots_1', label: 'Espacios Nivel 1', fieldType: 'number' },
  { key: 'spell_slots_2', label: 'Espacios Nivel 2', fieldType: 'number' },
  { key: 'spell_slots_3', label: 'Espacios Nivel 3', fieldType: 'number' },
  { key: 'spell_slots_4', label: 'Espacios Nivel 4', fieldType: 'number' },
  { key: 'spell_slots_5', label: 'Espacios Nivel 5', fieldType: 'number' },
  { key: 'spell_slots_6', label: 'Espacios Nivel 6', fieldType: 'number' },
  { key: 'spell_slots_7', label: 'Espacios Nivel 7', fieldType: 'number' },
  { key: 'spell_slots_8', label: 'Espacios Nivel 8', fieldType: 'number' },
  { key: 'spell_slots_9', label: 'Espacios Nivel 9', fieldType: 'number' },
  { key: 'spell_slots_10', label: 'Espacios Nivel 10', fieldType: 'number' },
  { key: 'focus_pool', label: 'Puntos de Foco', fieldType: 'number' },

  // 3.9 Equipo
  section('Equipo'),
  { key: 'armor_worn', label: 'Armadura', fieldType: 'text' },
  { key: 'shield', label: 'Escudo', fieldType: 'text' },
  { key: 'weapons', label: 'Armas', fieldType: 'textarea' },

  // 3.10 Recursos
  section('Recursos'),
  { key: 'hero_points', label: 'Puntos de Heroe', fieldType: 'number' },
  { key: 'focus_points', label: 'Puntos de Foco Actuales', fieldType: 'number' },
  { key: 'special_resources', label: 'Recursos Especiales', fieldType: 'textarea' },

  // 3.11 Notas
  section('Notas'),
  { key: 'personality', label: 'Personalidad', fieldType: 'textarea' },
  { key: 'appearance', label: 'Apariencia', fieldType: 'textarea' },
  { key: 'backstory', label: 'Trasfondo Narrativo', fieldType: 'textarea' },
  { key: 'allies', label: 'Aliados', fieldType: 'textarea' },
  { key: 'enemies', label: 'Enemigos', fieldType: 'textarea' },
  { key: 'notes', label: 'Notas', fieldType: 'textarea' },
]

// ---------------------------------------------------------------------------
// Tasks 4.1–4.6: NPC/Creature character template fields
// ---------------------------------------------------------------------------
export const NPC_CHARACTER_FIELDS = [
  // 4.1 Identidad
  section('Identidad'),
  { key: 'creature_type', label: 'Tipo de Criatura', fieldType: 'text' },
  { key: 'level', label: 'Nivel', fieldType: 'number', required: true },
  { key: 'alignment', label: 'Alineamiento', fieldType: 'text' },
  {
    key: 'size',
    label: 'Tamanio',
    fieldType: 'select',
    options: ['Diminuto', 'Pequeno', 'Mediano', 'Grande', 'Enorme', 'Descomunal'],
  },
  {
    key: 'rarity',
    label: 'Rareza',
    fieldType: 'select',
    options: ['Comun', 'Poco comun', 'Raro', 'Unico'],
  },
  { key: 'traits', label: 'Rasgos', fieldType: 'text' },

  // 4.2 Caracteristicas
  section('Caracteristicas'),
  { key: 'perception', label: 'Percepcion', fieldType: 'text' },
  { key: 'senses', label: 'Sentidos', fieldType: 'textarea' },
  { key: 'languages', label: 'Idiomas', fieldType: 'text' },
  { key: 'skills', label: 'Habilidades', fieldType: 'textarea' },

  // 4.3 Modificadores de Atributo
  section('Modificadores de Atributo'),
  { key: 'str', label: 'Fuerza', fieldType: 'number' },
  { key: 'dex', label: 'Destreza', fieldType: 'number' },
  { key: 'con', label: 'Constitucion', fieldType: 'number' },
  { key: 'int', label: 'Inteligencia', fieldType: 'number' },
  { key: 'wis', label: 'Sabiduria', fieldType: 'number' },
  { key: 'cha', label: 'Carisma', fieldType: 'number' },

  // 4.4 Defensas
  section('Defensas'),
  { key: 'ac', label: 'Clase de Armadura', fieldType: 'number', required: true },
  { key: 'max_hp', label: 'Puntos de Golpe', fieldType: 'number', required: true },
  { key: 'fortitude', label: 'Fortaleza', fieldType: 'text' },
  { key: 'reflex', label: 'Reflejos', fieldType: 'text' },
  { key: 'will', label: 'Voluntad', fieldType: 'text' },
  { key: 'immunities', label: 'Inmunidades', fieldType: 'text' },
  { key: 'resistances', label: 'Resistencias', fieldType: 'text' },
  { key: 'weaknesses', label: 'Debilidades', fieldType: 'text' },
  { key: 'special_defenses', label: 'Defensas Especiales', fieldType: 'textarea' },

  // 4.5 Ataque
  section('Ataque'),
  { key: 'speed', label: 'Velocidad', fieldType: 'text' },
  { key: 'melee_attacks', label: 'Ataques Cuerpo a Cuerpo', fieldType: 'textarea' },
  { key: 'ranged_attacks', label: 'Ataques a Distancia', fieldType: 'textarea' },
  { key: 'spells', label: 'Conjuros', fieldType: 'textarea' },
  { key: 'special_abilities', label: 'Habilidades Especiales', fieldType: 'textarea' },

  // 4.6 Fuente
  section('Fuente'),
  { key: 'source_book', label: 'Manual', fieldType: 'text' },
  { key: 'page', label: 'Pagina', fieldType: 'text' },
  { key: 'xp_award', label: 'XP Otorgada', fieldType: 'number' },
  { key: 'treasure', label: 'Tesoro', fieldType: 'text' },
]

export const CHARACTER_TEMPLATES = [
  {
    name: 'PJ PF2e',
    entityTypeSlug: 'character',
    isDefault: false,
    fields: PC_CHARACTER_FIELDS,
  },
  {
    name: 'PNJ/Criatura PF2e',
    entityTypeSlug: 'character',
    isDefault: true,
    fields: NPC_CHARACTER_FIELDS,
  },
]
