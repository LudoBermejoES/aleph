# OpenSpec en Aleph

Documentación de referencia para trabajar con OpenSpec en el proyecto Aleph.

## ¿Qué es OpenSpec?

OpenSpec es un framework de **Spec-Driven Development (SDD)** para asistentes de IA (Claude Code, Cursor, Copilot, etc.). Resuelve el problema de que la IA actúe sobre instrucciones vagas que viven solo en el historial de chat.

Su filosofía:
```
→ fluid not rigid       (no hay fases obligatorias)
→ iterative not waterfall
→ easy not complex
→ brownfield-first      (pensado para proyectos existentes)
```

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [01_conceptos.md](01_conceptos.md) | Conceptos core: specs, changes, artifacts, delta specs |
| [02_flujo_de_trabajo.md](02_flujo_de_trabajo.md) | Flujos de trabajo y cuándo usar cada comando |
| [03_comandos.md](03_comandos.md) | Referencia completa de comandos slash `/opsx:*` |
| [04_cli.md](04_cli.md) | Referencia del CLI (`openspec` en terminal) |
| [05_configuracion.md](05_configuracion.md) | Configuración del proyecto y schemas personalizados |

## Quickstart

```bash
# Instalar OpenSpec globalmente
npm install -g @fission-ai/openspec@latest

# Inicializar en Aleph
cd /Users/ludo/code/aleph
openspec init --tools claude
```

Luego en Claude Code:
```
/opsx:propose <nombre-del-cambio>
```

## El flujo básico

```
/opsx:propose ──► /opsx:apply ──► /opsx:archive
```

O con más control:
```
/opsx:explore ──► /opsx:new ──► /opsx:ff ──► /opsx:apply ──► /opsx:verify ──► /opsx:archive
```

## Estructura de archivos que crea

```
openspec/
├── specs/              # Fuente de verdad del sistema
│   └── <dominio>/
│       └── spec.md
├── changes/            # Cambios propuestos (uno por feature)
│   └── <nombre-cambio>/
│       ├── proposal.md
│       ├── design.md
│       ├── tasks.md
│       └── specs/      # Delta specs (qué cambia)
│           └── <dominio>/
│               └── spec.md
└── config.yaml         # Configuración del proyecto
```

## Nota sobre el change `frontend-data-layer`

El change `openspec/changes/frontend-data-layer/` fue el primero completado en Aleph — refactor del frontend para reemplazar todos los `$fetch` inline con el composable tipado `useCampaignApi`. Sirve como referencia de cómo quedan los artifacts tras un change real.
