# 📜 CONSTITUTION.md
## Sistema de Trazabilidad Bovina — Documento de Gobierno del Proyecto

> **Este documento es la ley suprema del proyecto.**
> Toda decisión técnica, de diseño, de seguridad o de calidad tomada por cualquier agente de IA o desarrollador humano
> deberá ser consistente con los principios aquí establecidos. Ninguna excepción está permitida sin una enmienda
> explícita a este documento, debidamente justificada y registrada.

---

## 📌 Tabla de Contenidos

1. [Visión y Alcance del Proyecto](#1-visión-y-alcance-del-proyecto)
2. [Stack Tecnológico Obligatorio](#2-stack-tecnológico-obligatorio)
3. [Arquitectura y Estructura del Proyecto](#3-arquitectura-y-estructura-del-proyecto)
4. [Principios de Calidad de Código](#4-principios-de-calidad-de-código)
5. [Identidad Visual y Sistema de Diseño](#5-identidad-visual-y-sistema-de-diseño)
6. [Seguridad y Control de Acceso](#6-seguridad-y-control-de-acceso)
7. [Persistencia y Modelo de Datos](#7-persistencia-y-modelo-de-datos)
8. [Pruebas y Documentación](#8-pruebas-y-documentación)
9. [Flujo de Trabajo y Convenciones](#9-flujo-de-trabajo-y-convenciones)
10. [Reglas para Agentes de IA](#10-reglas-para-agentes-de-ia)
11. [Glosario del Dominio](#11-glosario-del-dominio)
12. [Registro de Enmiendas](#12-registro-de-enmiendas)

---

## 1. Visión y Alcance del Proyecto

### 1.1 Descripción General

El **Sistema de Trazabilidad Bovina** es una plataforma web de gestión integral diseñada para rastrear el ciclo de vida
completo del ganado bovino: desde el nacimiento o ingreso al predio hasta su destino final (venta, sacrificio o muerte).
El sistema garantiza trazabilidad sanitaria, productiva y genealógica, cumpliendo con los estándares nacionales e
internacionales de inocuidad alimentaria y bienestar animal.

### 1.2 Objetivos Principales

- **Trazabilidad Individual**: Identificar y seguir a cada animal mediante un código visual único de 10 dígitos.
- **Gestión Sanitaria**: Registrar vacunaciones, tratamientos, diagnósticos y respetar los periodos de retiro de medicamentos.
- **Productividad**: Controlar pesajes, condición corporal, gestaciones, partos y producción láctea.
- **Genealogía**: Mantener el árbol genealógico de cada animal (madre, padre, descendencia).
- **Reportería y Alertas**: Generar reportes regulatorios y alertas automáticas ante eventos críticos.
- **Multi-usuario y Roles**: Soportar múltiples roles con permisos diferenciados en un mismo predio.

### 1.3 Usuarios Objetivo

| Rol          | Descripción                                                            |
|--------------|------------------------------------------------------------------------|
| Administrador | Dueño o gerente del predio. Acceso total al sistema.                  |
| Veterinario   | Gestiona eventos sanitarios, diagnósticos y tratamientos.             |
| Operario      | Registra pesajes, alimentación y novedades diarias en campo.          |
| Estudiante    | Acceso de solo lectura con fines académicos o de práctica.            |

---

## 2. Stack Tecnológico Obligatorio

> ⚠️ **REGLA ABSOLUTA**: No se introducirán tecnologías fuera de este stack sin una enmienda aprobada al presente documento.

### 2.1 Backend

| Tecnología    | Versión Mínima | Rol                                          |
|---------------|----------------|----------------------------------------------|
| Node.js       | 20.x LTS       | Runtime de ejecución                         |
| TypeScript    | 5.x            | Lenguaje principal (modo `strict: true`)     |
| Express.js    | 4.x            | Framework HTTP                               |
| Prisma ORM    | 5.x            | Acceso a base de datos y migraciones         |
| SQLite        | 3.x            | Motor de base de datos                       |
| JWT           | —              | Autenticación stateless                      |
| bcrypt        | —              | Hashing de contraseñas                       |
| Zod           | 3.x            | Validación de esquemas en runtime            |
| Jest          | 29.x           | Framework de pruebas unitarias               |

### 2.2 Frontend

| Tecnología      | Versión Mínima | Rol                                        |
|-----------------|----------------|--------------------------------------------|
| React           | 18.x           | Librería de UI                             |
| TypeScript      | 5.x            | Lenguaje principal                         |
| Vite            | 5.x            | Bundler y servidor de desarrollo           |
| Tailwind CSS    | 3.x            | Framework de estilos (paleta estricta)     |
| React Router    | 6.x            | Enrutamiento en el cliente                 |
| React Hook Form | 7.x            | Manejo de formularios                      |
| Zod             | 3.x            | Validación de formularios                  |
| Axios           | —              | Cliente HTTP                               |
| React Query     | 5.x            | Estado del servidor y caché                |

### 2.3 Herramientas de Desarrollo

| Herramienta  | Propósito                                   |
|--------------|---------------------------------------------|
| ESLint       | Linting con reglas TypeScript estrictas     |
| Prettier     | Formateo de código (estándar del proyecto)  |
| Husky        | Git hooks para validación pre-commit        |
| lint-staged  | Ejecutar linters solo sobre archivos staged |

---

## 3. Arquitectura y Estructura del Proyecto

### 3.1 Patrón de Arquitectura

El proyecto sigue una **arquitectura en capas** con separación estricta de responsabilidades:

```
[Cliente HTTP / React App]
         │
         ▼
   [Capa de Rutas]          → Definición de endpoints, middlewares de auth/rol
         │
         ▼
  [Capa de Controladores]   → Orquestación: recibe request, llama servicio, devuelve response
         │
         ▼
   [Capa de Servicios]      → Lógica de negocio pura, independiente de HTTP
         │
         ▼
  [Capa de Repositorio]     → Acceso a datos vía Prisma (abstracción de DB)
         │
         ▼
    [Base de Datos SQLite]
```

**Regla**: Ninguna capa puede "saltarse" otra. Un controlador nunca llama directamente a Prisma; siempre pasa por el servicio.

### 3.2 Estructura de Directorios

```
Trazabilidad_Bovina/
│
├── CONSTITUTION.md                     ← Este documento (no modificar sin enmienda)
│
├── backend/
│   ├── src/
│   │   ├── config/                     ← Variables de entorno, configuración de DB
│   │   │   └── database.ts
│   │   ├── routes/                     ← Definición de rutas Express por módulo
│   │   │   ├── animal.routes.ts
│   │   │   ├── health.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── index.ts
│   │   ├── controllers/                ← Controladores por módulo
│   │   │   ├── animal.controller.ts
│   │   │   ├── health.controller.ts
│   │   │   └── user.controller.ts
│   │   ├── services/                   ← Lógica de negocio por módulo
│   │   │   ├── animal.service.ts
│   │   │   ├── health.service.ts
│   │   │   └── user.service.ts
│   │   ├── repositories/               ← Acceso a datos (Prisma)
│   │   │   ├── animal.repository.ts
│   │   │   └── health.repository.ts
│   │   ├── middlewares/                ← Auth, roles, manejo de errores
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rbac.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── validators/                 ← Esquemas Zod por módulo
│   │   │   ├── animal.validator.ts
│   │   │   └── health.validator.ts
│   │   ├── types/                      ← Tipos e interfaces TypeScript globales
│   │   │   ├── express.d.ts            ← Extensión del tipo Request de Express
│   │   │   └── index.ts
│   │   └── app.ts                      ← Instancia de Express, registro de middlewares
│   ├── prisma/
│   │   ├── schema.prisma               ← Esquema de la base de datos
│   │   └── migrations/
│   ├── tests/                          ← Tests unitarios (Jest)
│   │   ├── services/
│   │   └── validators/
│   ├── .env                            ← Variables de entorno (NO commitear)
│   ├── .env.example                    ← Plantilla de variables (SÍ commitear)
│   ├── jest.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/                     ← Imágenes, íconos y recursos estáticos
│   │   ├── components/                 ← Componentes reutilizables (átomos/moléculas)
│   │   │   ├── ui/                     ← Componentes base: Button, Input, Badge, Modal
│   │   │   └── shared/                 ← Componentes de dominio compartido
│   │   ├── features/                   ← Módulos por funcionalidad (feature-sliced)
│   │   │   ├── animals/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   └── api/
│   │   │   ├── health/
│   │   │   └── users/
│   │   ├── hooks/                      ← Custom hooks globales
│   │   ├── layouts/                    ← Layouts de página (MainLayout, AuthLayout)
│   │   ├── pages/                      ← Componentes de página (enrutados)
│   │   ├── router/                     ← Configuración de React Router
│   │   ├── services/                   ← Clientes API (Axios instances)
│   │   ├── store/                      ← Estado global (Context API o Zustand)
│   │   ├── types/                      ← Tipos e interfaces del dominio
│   │   ├── utils/                      ← Funciones utilitarias puras
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── tailwind.config.ts              ← Configuración con paleta de colores estricta
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
└── docs/                               ← Documentación adicional del proyecto
    ├── api/                            ← Documentación de endpoints
    └── diagrams/                       ← Diagramas de arquitectura y BD
```

---

## 4. Principios de Calidad de Código

### 4.1 TypeScript — Modo Estricto

Toda configuración de TypeScript **DEBE** incluir las siguientes opciones en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

- **PROHIBIDO**: Usar `any` explícito. Usar `unknown` con type guards cuando sea necesario.
- **PROHIBIDO**: Usar `!` (non-null assertion) sin un comentario que justifique su uso.
- **OBLIGATORIO**: Todos los tipos exportados deben estar en archivos `*.types.ts` o en el directorio `types/`.

### 4.2 Principios SOLID

| Principio | Aplicación en este proyecto                                               |
|-----------|---------------------------------------------------------------------------|
| **S** — Single Responsibility | Un servicio = un dominio. `AnimalService` solo gestiona animales. |
| **O** — Open/Closed | Usar interfaces para extender comportamiento sin modificar código existente. |
| **L** — Liskov Substitution | Las implementaciones de repositorios deben ser intercambiables. |
| **I** — Interface Segregation | Interfaces pequeñas y específicas por caso de uso. |
| **D** — Dependency Inversion | Servicios dependen de interfaces de repositorio, no de implementaciones concretas. |

### 2.7 Auditoría de Movilizaciones en Lote (SIFAE/CZPM-M)

- **Auditoría Inmutable**: Todo traslado de un animal debe generar de forma obligatoria un registro histórico inmutable acoplado al CUI del bovino. Queda estrictamente prohibido alterar o borrar el historial de movimientos pasados. Todos los textos, marcas y marcadores del formulario de movimiento deben usar clases de contraste `text-gray-950`.
- **Guías de Movilización (SIFAC/SIFAE/CZPM-M)**: El sistema debe soportar el traslado masivo de animales mediante la emisión de "Guías de Movilización". Toda guía generada debe registrar el movimiento en lote en la base de datos y producir un documento en formato PDF listo para imprimir.
- **Flujo Wizard y Shuttle List**: El módulo de Guías debe operar mediante un flujo de pasos (Wizard) y utilizar un selector de listas transferibles (Shuttle) para el inventario.
- **Formato Oficial PDF**: El documento final en PDF debe emular la estructura de matriz tabular oficial de tránsito zoosanitario (CZPM-M), separando origen, destino, conductor y lote, con campos legales de custodia (Cédula, Chofer, Placa, Ruta y firmas).

### 4.3 Convenciones de Nomenclatura

| Elemento              | Convención         | Ejemplo                          |
|-----------------------|--------------------|----------------------------------|
| Archivos (Backend)    | `kebab-case`       | `animal.service.ts`              |
| Archivos (Frontend)   | `PascalCase`       | `AnimalCard.tsx`                 |
| Clases e Interfaces   | `PascalCase`       | `AnimalService`, `IAnimalRepo`   |

Toda dependencia, hook personalizado de estado (como `useAuthStore`, `useQuery`, etc.) o utilitario externo introducido durante un refactor debe estar explícitamente importado en la cabecera del archivo correspondiente. Quedan estrictamente prohibidos los `ReferenceError` por falta de declaraciones de importación.

### 4.5 Auditoría de Movilizaciones

Todo traslado de un animal debe generar de forma obligatoria un registro histórico inmutable acoplado al CUI del bovino. Queda estrictamente prohibido alterar o borrar el historial de movimientos pasados. Todos los textos, marcas y marcadores del formulario de movimiento deben usar clases de contraste `text-gray-950`.

### 4.6 Integridad de Importaciones

Al generar o refactorizar subcomponentes dentro de estructuras de directorios profundas (como `src/features/movements/components/`), el IDE debe validar rigurosamente la resolución de rutas relativas. Queda prohibido dejar rutas rotas que causen fallos de análisis en el plugin de Vite.

### 4.7 Movilizaciones en Lote (CSMI)

El sistema debe soportar el traslado masivo de animales mediante la emisión de "Guías de Movilización". Toda guía generada debe registrar el movimiento en lote en la base de datos y producir un documento en formato PDF listo para imprimir, con campos legales de custodia (Cédula, Chofer, Placa, Ruta y firmas).

### 4.8 Resiliencia de Red

Toda petición asíncrona gestionada por React Query o Zustand debe tener obligatoriamente un manejo de estado de error (`isError`). Queda estrictamente prohibido mostrar spinners de carga infinitos cuando la petición de red falla. Si la API no responde, el sistema debe renderizar un componente de Error/Alerta amigable indicando el fallo de conexión.
| Variables y funciones | `camelCase`        | `getAnimalById`, `codigoVisual`  |
| Constantes globales   | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS`             |
| Esquemas Zod          | `camelCase` + Schema | `animalCreateSchema`           |
| Tablas en BD          | `PascalCase` (Prisma) | `Animal`, `EventoSanitario`  |
| Columnas en BD        | `camelCase` (Prisma) | `codigoVisual`, `fechaNacimiento` |

### 4.4 Manejo de Errores

- **Backend**: Todos los errores se propagan a un middleware central de errores (`error.middleware.ts`).
- **Clases de Error**: Crear clases de error tipadas: `NotFoundError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`.
- **Respuestas de Error**: Formato uniforme para todas las respuestas de error:

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;      // Ej: "ANIMAL_NOT_FOUND"
    message: string;   // Mensaje legible para el usuario
    details?: unknown; // Detalles adicionales (solo en desarrollo)
  };
}
```

- **Respuestas Exitosas**: Formato uniforme para todas las respuestas exitosas:

```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

---

## 5. Identidad Visual y Sistema de Diseño

> ⚠️ **REGLA ABSOLUTA**: Queda estrictamente prohibido el uso de grises oscuros, grises azulados, pizarras o layouts tipo 'dark mode' en los contenedores principales del sistema. La interfaz debe ser **Light Mode Puro**, optimizada para exteriores bajo luz solar.

### 5.1 Paleta de Colores Oficial (Light Mode)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PALETA OFICIAL — TRAZABILIDAD BOVINA                      │
├──────────────────┬────────────────┬──────────────────────────────────────────┤
│ NOMBRE           │ HEX / Tailwind │ USO SEMÁNTICO                            │
├──────────────────┼────────────────┼──────────────────────────────────────────┤
│ Verde Esmeralda  │ #218247        │ Color PRIMARIO. Botones activos,         │
│ (Primary)        │ custom-primary │ indicadores de éxito, acentos.           │
├──────────────────┼────────────────┼──────────────────────────────────────────┤
│ Verde Pastel     │ #e2f0d9        │ Detalles, bordes, selección sutil.       │
│ (Pastel Green)   │ bg-emerald-50  │                                          │
├──────────────────┼────────────────┼──────────────────────────────────────────┤
│ Fondo General    │ #f8f9fa        │ Fondo base de la aplicación.             │
│ (Background)     │ var(--bg-background) Gris claro / blanco roto.             │
├──────────────────┼────────────────┼──────────────────────────────────────────┤
│ Contenedores     │ #ffffff        │ Blanco puro para tarjetas, modales y     │
│ (Surface)        │ bg-white       │ áreas de contenido (máximo contraste).   │
├──────────────────┼────────────────┼──────────────────────────────────────────┤
│ Texto Principal  │ #111827        │ Tipografía principal. Negro profundo     │
│ (Text Dark)      │ text-gray-900  │ para garantizar alta legibilidad al sol. │
├──────────────────┼────────────────┼──────────────────────────────────────────┤
│ Rojo Alerta      │ #dc2626        │ EXCLUSIVO para banners de retiro         │
│ (Danger/Alert)   │ bg-danger      │ farmacológico o errores críticos.        │
└──────────────────┴────────────────┴──────────────────────────────────────────┘
```

### 5.2 Configuración Obligatoria de Tailwind CSS

El archivo `tailwind.config.ts` (o `.js`) del frontend **DEBE** incluir la siguiente configuración de tema, enfocada en la paleta clara:

```typescript
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#34d399',   // Emerald 400 — Pastel Green
          light: '#6ee7b7',
          dark: '#059669',
        },
        secondary: {
          DEFAULT: '#854d0e',
          light: '#6b5344',
          dark: '#2e2018',
        },
        surface: '#ffffff',     // Blanco puro — tarjetas, modales
        background: '#f8f9fa',  // Fondo base de la app
        'text-primary': '#111827',  // Negro profundo
        danger: {
          DEFAULT: '#dc2626',
          light: '#ef4444',
          dark: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'brand': '8px',
        'brand-lg': '12px',
        'brand-xl': '16px',
      },
    },
  },
  plugins: [],
};
```

### 5.3 Reglas de Componentes UI

#### Botones

| Variante  | Clases Base Tailwind                                              | Cuándo usar                       |
|-----------|-------------------------------------------------------------------|-----------------------------------|
| Primary   | `bg-primary text-white hover:bg-primary-light`                   | Acción principal del formulario   |
| Secondary | `bg-secondary text-white hover:bg-secondary-light`               | Acciones secundarias              |
| Outline   | `border-2 border-primary text-primary hover:bg-primary/10`       | Cancelar, volver                  |
| Danger    | `bg-danger text-white hover:bg-danger-light`                     | Eliminar, deshabilitar            |
| Ghost     | `text-primary hover:bg-primary/10`                               | Acciones terciarias               |

#### Badges de Estado Animal

| Estado       | Clases Tailwind                                | Significado                           |
|--------------|------------------------------------------------|---------------------------------------|
| Activo       | `bg-primary/20 text-primary border border-primary/40` | Animal en predio, saludable |
| En Retiro    | `bg-danger/20 text-danger border border-danger/40`    | Periodo de retiro medicamento |
| Gestante     | `bg-amber-100 text-amber-800 border border-amber-300` | Hembra en gestación          |
| Vendido      | `bg-gray-100 text-gray-600 border border-gray-300`    | Animal egresado por venta     |
| Fallecido    | `bg-gray-200 text-gray-700 border border-gray-400`    | Registro histórico            |

### 5.4 Tipografía y Jerarquía Visual

```
H1 — text-3xl font-bold text-text-primary    → Título de página
H2 — text-2xl font-semibold text-text-primary → Título de sección
H3 — text-xl font-medium text-text-primary   → Título de subsección
H4 — text-lg font-medium text-secondary      → Etiqueta de grupo
Body — text-base text-gray-700               → Texto de contenido
Small — text-sm text-gray-500                → Metadatos, ayudas
Mono — font-mono text-sm text-gray-800       → Códigos, IDs
```

### 5.5 Principios de Accesibilidad para Uso en Campo

- Todos los elementos interactivos deben tener un tamaño mínimo de `44x44px` (touch target).
- Contraste mínimo de texto: **4.5:1** (WCAG AA). **ENMIENDA ESTRICTA DE UI**: Queda terminantemente prohibido el uso de clases `text-white`, `text-gray-100` o similares en cualquier elemento de texto, label, título de tarjeta o input que se renderice sobre fondos claros (`bg-white`, `bg-gray-50`). Todo el texto de la aplicación debe heredar por defecto un color oscuro (`text-gray-950` o `text-gray-800`) para garantizar la accesibilidad WCAG AA. Todo texto descriptivo, placeholder, label o datos de formularios debe usar clases de alto contraste como `text-gray-950` o `text-gray-900`.
- El campo `raza` es fijo "CHAROLAIS" por sistema, pero visualmente debe ser legible con tipografía oscura.
- Íconos siempre acompañados de texto o `aria-label` descriptivo.
- El código visual del animal siempre se muestra en `font-mono font-bold text-lg` para lectura rápida.

### 5.6 Fórmulas Zootécnicas Obligatorias

El "Módulo de Métricas Zootécnicas Avanzadas" exige la implementación de las siguientes fórmulas:
- **Cálculo de Peso Estimado**: Basado en Perímetro Torácico (PT) y Longitud Corporal (LC). Fórmula: `Peso = (PT * PT * LC) / 10.838`. (El sistema priorizará la entrada manual si el operario sobrescribe este valor).
- **Peso Ajustado a 205 días (Destete)**: `[(Peso Real - Peso al Nacer) / Edad al destete en días] * 205 + Peso al Nacer`.
- **Peso Ajustado a 365 días (Año)**: `[(Peso Real - Peso al Nacer) / Edad en días] * 365 + Peso al Nacer`.

---

## 6. Seguridad y Control de Acceso

### 6.1 Autenticación

- **Mecanismo**: JSON Web Tokens (JWT) con expiración de **8 horas** (jornada laboral estándar).
- **Refresh Tokens**: Implementar refresh tokens con expiración de **7 días**, almacenados en cookies `httpOnly`.
- **Hashing**: Contraseñas hasheadas con `bcrypt` usando un costo mínimo de **12 rounds**.
- **PROHIBIDO**: Almacenar contraseñas, tokens de acceso o datos sensibles en `localStorage`.

### 6.2 Control de Acceso por Roles (RBAC)

```
┌─────────────────┬─────────────┬──────────────┬──────────────┬──────────────┐
│ RECURSO/ACCIÓN  │ ADMIN       │ VETERINARIO  │ OPERARIO     │ ESTUDIANTE   │
├─────────────────┼─────────────┼──────────────┼──────────────┼──────────────┤
│ Animales (CRUD) │ ✅ Completo  │ ✅ Leer/Editar│ ✅ Leer/Crear│ 👁️ Solo leer  │
│ Eventos Sanit.  │ ✅ Completo  │ ✅ Completo   │ 👁️ Solo leer │ 👁️ Solo leer  │
│ Tratamientos    │ ✅ Completo  │ ✅ Completo   │ 👁️ Solo leer │ 👁️ Solo leer  │
│ Usuarios (CRUD) │ ✅ Completo  │ ❌ No accede  │ ❌ No accede │ ❌ No accede  │
│ Reportes        │ ✅ Completo  │ ✅ Completo   │ 📊 Limitado  │ 👁️ Solo leer  │
│ Configuración   │ ✅ Completo  │ ❌ No accede  │ ❌ No accede │ ❌ No accede  │
│ Pesajes         │ ✅ Completo  │ ✅ Leer/Editar│ ✅ Completo  │ 👁️ Solo leer  │
│ Genealogía      │ ✅ Completo  │ ✅ Leer/Editar│ 👁️ Solo leer │ 👁️ Solo leer  │
└─────────────────┴─────────────┴──────────────┴──────────────┴──────────────┘
```

- **Creación de Fincas**: Restringida estrictamente a SUPER_ADMIN y PROPIETARIO. Ningún otro rol puede insertar Predios.
- **Diseño (Eventos Lote y Usuarios)**: El color de texto para todos los contenedores interactivos y elementos de formularios mutables debe ser rigurosamente `text-gray-950`.

### 6.3 Validación del Código Visual (Regla Crítica)

El código visual es el identificador primario de cada animal. Las siguientes reglas son **INVIOLABLES**:

- **Formato**: Exactamente **10 dígitos numéricos**. Ni más, ni menos.
- **Unicidad**: Debe ser único en toda la base de datos del predio.
- **Validación Backend** (Zod):
  ```typescript
  const codigoVisualSchema = z.string()
    .length(10, 'El código visual debe tener exactamente 10 dígitos')
    .regex(/^\d{10}$/, 'El código visual debe contener solo dígitos numéricos');
  ```
- **Validación Frontend** (React Hook Form + Zod): Misma regla aplicada en formularios.
- **Inmutabilidad**: Una vez asignado, el código visual **NO PUEDE MODIFICARSE** a través de la UI. Solo un administrador puede hacerlo mediante un proceso de corrección auditado.

### 6.4 Seguridad General

- **Helmet.js**: Activado en Express para cabeceras HTTP seguras.
- **Rate Limiting**: Máximo 100 requests por IP cada 15 minutos en endpoints de autenticación.
- **CORS**: Configurado explícitamente con lista blanca de orígenes permitidos.
- **SQL Injection**: Mitigado por el uso de Prisma (queries parametrizadas). **PROHIBIDO** construir queries SQL raw con interpolación de strings.
- **Variables de Entorno**: Todas las credenciales y secrets deben vivir en `.env`. **NUNCA** hardcodear en código fuente.
- **Auditoría**: Toda operación de creación, modificación o eliminación debe registrar `userId`, `timestamp` y `action` en una tabla `AuditLog`.

---

## 7. Persistencia y Modelo de Datos

### 7.1 Reglas de Prisma y SQLite

- **ORM Exclusivo**: Prisma es el único mecanismo permitido para acceder a la base de datos.
- **Migraciones**: Todos los cambios de esquema DEBEN hacerse mediante `prisma migrate dev`. **PROHIBIDO** modificar la base de datos SQLite directamente.
- **Integridad Referencial**: Todas las relaciones deben tener restricciones `onDelete` y `onUpdate` explícitas.
- **Timestamps**: Todos los modelos deben incluir `createdAt` y `updatedAt` (gestionados por Prisma).
- **Soft Delete**: Los modelos con datos históricos críticos (Animal, EventoSanitario) usan soft delete (`deletedAt DateTime?`) en lugar de eliminación física.

### 7.2 Entidades Core del Dominio

```
Animal {
  id              Int       @id @autoincrement
  codigoVisual    String    @unique @db.Char(10)  // 10 dígitos, obligatorio
  nombre          String?                          // Nombre opcional
  especie         String    @default("Bovino")
  raza            String
  sexo            Sexo                             // Enum: MACHO | HEMBRA
  fechaNacimiento DateTime?
  pesoNacimiento  Float?
  estado          EstadoAnimal @default(ACTIVO)    // Enum: ACTIVO | VENDIDO | MUERTO | EN_RETIRO
  madreId         Int?
  padreId         Int?
  predioId        Int
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?                        // Soft delete
}

EventoSanitario {
  id              Int       @id @autoincrement
  animalId        Int
  tipo            TipoEvento                       // Enum: VACUNACION | TRATAMIENTO | DIAGNOSTICO
  fecha           DateTime
  producto        String?
  dosis           String?
  viaAdministracion String?
  periodoRetiro   Int?                             // Días de retiro (activa alerta ROJO)
  fechaFinRetiro  DateTime?                        // Calculado automáticamente
  veterinarioId   Int?
  observaciones   String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

Pesaje {
  id              Int       @id @autoincrement
  animalId        Int
  fecha           DateTime
  peso            Float
  condicionCorporal Float?                         // Escala 1-5
  operarioId      Int
  observaciones   String?
  createdAt       DateTime  @default(now())
}

Usuario {
  id              Int       @id @autoincrement
  nombre          String
  email           String    @unique
  passwordHash    String
  rol             Rol                              // Enum: ADMIN | VETERINARIO | OPERARIO | ESTUDIANTE
  predioId        Int
  activo          Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

---

## 8. Pruebas y Documentación

### 8.1 Cobertura de Pruebas Mínima Requerida

- **Servicios**: Cobertura mínima del **80%** para toda la lógica de negocio.
- **Validadores (Zod)**: Pruebas obligatorias para casos válidos e inválidos (incluyendo el código visual de 10 dígitos).
- **Middleware de Auth/RBAC**: Pruebas para todos los roles en rutas protegidas.

### 8.2 Estructura de Tests

```typescript
// Ejemplo: backend/tests/services/animal.service.test.ts
describe('AnimalService', () => {
  describe('createAnimal', () => {
    it('should create an animal with a valid 10-digit codigoVisual', async () => { /* ... */ });
    it('should throw ValidationError if codigoVisual has less than 10 digits', async () => { /* ... */ });
    it('should throw ValidationError if codigoVisual has more than 10 digits', async () => { /* ... */ });
    it('should throw ConflictError if codigoVisual already exists', async () => { /* ... */ });
  });
});
```

### 8.3 Documentación JSDoc Obligatoria

Todo servicio, controlador y función de utilidad compleja **DEBE** incluir JSDoc:

```typescript
/**
 * Registra un nuevo evento sanitario para un animal.
 * Si el evento incluye un período de retiro, calcula y registra la fecha
 * de fin de retiro y actualiza el estado del animal a EN_RETIRO.
 *
 * @param {number} animalId - ID del animal afectado.
 * @param {CreateEventoSanitarioDto} dto - Datos del evento sanitario.
 * @param {number} userId - ID del usuario que registra el evento (para auditoría).
 * @returns {Promise<EventoSanitario>} El evento sanitario creado.
 * @throws {NotFoundError} Si el animal no existe o está inactivo.
 * @throws {ForbiddenError} Si el usuario no tiene rol de VETERINARIO o ADMIN.
 */
async createEventoSanitario(
  animalId: number,
  dto: CreateEventoSanitarioDto,
  userId: number
): Promise<EventoSanitario> { /* ... */ }
```

---

## 9. Flujo de Trabajo y Convenciones

### 9.1 Convenciones de Git

- **Branches**: `feature/<nombre>`, `fix/<nombre>`, `hotfix/<nombre>`, `chore/<nombre>`.
- **Commits**: Seguir [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: add animal registration form`
  - `fix: validate codigoVisual length on frontend`
  - `docs: update CONSTITUTION.md with audit log entity`
  - `test: add unit tests for AnimalService`
  - `refactor: extract validation logic to separate module`

### 9.2 Pull Requests / Code Reviews

- Todo cambio requiere al menos **1 revisión** antes de merge.
- Los PRs **DEBEN** incluir: descripción del cambio, evidencia de prueba (screenshot o test output) y referencia al ticket.
- **PROHIBIDO** hacer merge directamente a `main` sin revisión.

### 9.3 Variables de Entorno

El archivo `.env.example` **DEBE** mantenerse actualizado con todas las variables necesarias:

```env
# Backend — .env.example
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:5173
```

---

## 10. Reglas para Agentes de IA

> Esta sección es una directiva directa para cualquier agente de IA que asista en el desarrollo de este proyecto.

### 10.1 Mandatos Absolutos

1. **Consultar este documento PRIMERO**: Antes de generar cualquier código, verificar que la solución propuesta es consistente con esta Constitución.

2. **Paleta de colores**: Nunca generar componentes UI con colores no definidos en la Sección 5. Si se necesita un color nuevo, proponer una enmienda a este documento.

3. **Código Visual de 10 dígitos**: Implementar la validación estricta de 10 dígitos numéricos en TODOS los puntos donde se ingrese un `codigoVisual`, tanto en backend (Zod) como en frontend (React Hook Form).

4. **TypeScript estricto**: Nunca usar `any`. Nunca omitir tipos. Nunca usar `// @ts-ignore` sin justificación documentada.

5. **Arquitectura en capas**: Nunca generar código que mezcle responsabilidades entre capas. Los controladores no contienen lógica de negocio. Los servicios no conocen el objeto `Request` de Express.

6. **Seguridad por defecto**: Todo endpoint nuevo es `privado` por defecto. Si no se especifica lo contrario, aplicar `authMiddleware` y `rbacMiddleware`.

7. **Prisma exclusivo**: Nunca generar código con queries SQL crudas (`db.exec()`, `db.prepare()`, etc.). Siempre usar el cliente Prisma.

### 10.2 Ante la Ambigüedad

Si una instrucción de desarrollo es ambigua o contradice esta Constitución:
1. Señalar la contradicción explícitamente.
2. Proponer la solución que mejor se alinee con los principios de este documento.
3. Si se necesita una excepción, documentarla como enmienda en la Sección 12.

### 10.3 Formato de Entrega de Código

Cuando se genere código, seguir este orden de entrega:
1. **Tipos/Interfaces** primero (si aplica).
2. **Schema de validación Zod** (si aplica).
3. **Repositorio** → **Servicio** → **Controlador** → **Ruta** (Backend).
4. **Hook API** → **Componente** (Frontend).
5. **Tests unitarios** al final.

---

## 11. Glosario del Dominio

| Término              | Definición                                                                                      |
|----------------------|-------------------------------------------------------------------------------------------------|
| **Código Visual**    | Identificador único de 10 dígitos numéricos asignado a cada animal. Es el identificador primario visible en el campo (caravana, tatuaje, etc.). |
| **Predio**           | Establecimiento ganadero (finca, hacienda). Unidad de gestión principal del sistema.           |
| **Evento Sanitario** | Cualquier intervención de salud sobre un animal: vacunación, tratamiento, diagnóstico.         |
| **Período de Retiro**| Tiempo en días que debe transcurrir tras la aplicación de un medicamento antes de que el animal pueda ir a faena. Se visualiza en ROJO. |
| **Condición Corporal**| Valoración subjetiva (escala 1-5) del estado nutricional y físico del animal.                |
| **Genealogía**       | Árbol familiar del animal que registra la relación con su madre y padre.                       |
| **Soft Delete**      | Eliminación lógica: el registro permanece en la base de datos con `deletedAt` poblado, pero no es visible en la aplicación. |
| **RBAC**             | Role-Based Access Control. Sistema de permisos basado en el rol asignado a cada usuario.       |
| **CRUD**             | Create, Read, Update, Delete. Operaciones básicas de persistencia.                             |
| **DTO**              | Data Transfer Object. Objeto tipado que define la forma de los datos entrantes a un servicio.  |

---

## 12. Registro de Enmiendas

> Toda modificación a esta Constitución debe registrarse aquí con justificación y fecha.

| N° | Fecha      | Sección Modificada | Descripción del Cambio                    | Autor           |
|----|------------|--------------------|-------------------------------------------|-----------------|
| 01 | 2026-06-18 | Documento completo | Creación inicial del documento rector.    | Arquitecto IA   |
| 02 | 2026-06-18 | Sección 5.1 y 5.2  | Color primario actualizado de `#0f5132` a `#2e9f5b` (verde más vibrante). Actualizado en paleta, Tailwind config y tokens. | Usuario         |
| 03 | 2026-06-18 | Modelo Datos (1.2) | Se implementó la Enmienda para generar el Código Único de Sistema Animal (CUI/CUSA) de forma automatizada en el formato BOV-AÑO-PREDIO-SECUENCIAL. | Arquitecto IA   |
| 04 | 2026-06-26 | Sección 5.1 y 5.2  | Reversión total del tema claro (Blanco/Verde) al tema Dark Glassmorphism original, eliminando los fondos claros y exigiendo paneles translúcidos. | Usuario         |
| 05 | 2026-06-27 | Sección 5.5 y 5.6  | Enmienda de Accesibilidad Visual (Light Mode Puro y contraste estricto text-gray-900) e inclusión de Módulo de Métricas Zootécnicas. | Usuario         |

---

<div align="center">

**📜 Documento redactado y vigente desde el 18 de junio de 2026.**

*"La trazabilidad no es solo seguir animales; es garantizar confianza en cada eslabón de la cadena alimentaria."*

[![Estado: Vigente](https://img.shields.io/badge/Estado-Vigente-0f5132?style=for-the-badge)](.)
[![Versión: 1.0.0](https://img.shields.io/badge/Versión-1.0.0-4a3728?style=for-the-badge)](.)

</div>
