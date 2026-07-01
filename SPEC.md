# 📐 SPEC.md — Especificación Técnica del Sistema
## Sistema de Trazabilidad Bovina — v1.0.0

> **Documento de referencia técnica.** Define los contratos de API, esquemas de datos, reglas de negocio
> y arquitectura de todos los módulos del sistema. Toda implementación debe ser consistente con este documento
> y con las directrices de `CONSTITUTION.md`.

---

## 📌 Tabla de Contenidos

1. [Modelo de Datos (Prisma Schema)](#1-modelo-de-datos-prisma-schema)
2. [Arquitectura de la API REST](#2-arquitectura-de-la-api-rest)
3. [Módulo 1 — Identificación y Registro Base](#3-módulo-1--identificación-y-registro-base)
4. [Módulo 2 — Historial Clínico y Control Sanitario](#4-módulo-2--historial-clínico-y-control-sanitario)
5. [Módulo 3 — Productividad, Reproducción y Movimiento](#5-módulo-3--productividad-reproducción-y-movimiento)
6. [Módulo 4 — Consulta e Informes](#6-módulo-4--consulta-e-informes)
7. [Esquemas de Validación Zod](#7-esquemas-de-validación-zod)
8. [Matriz RBAC Detallada](#8-matriz-rbac-detallada)
9. [Reglas de Negocio Críticas](#9-reglas-de-negocio-críticas)
10. [Plan de Implementación por Fases](#10-plan-de-implementación-por-fases)
11. [Requisitos No Funcionales](#11-requisitos-no-funcionales)

---

## 1. Modelo de Datos (Prisma Schema)

### 1.1 Schema Completo — `prisma/schema.prisma`

```prisma
// prisma/schema.prisma
// Sistema de Trazabilidad Bovina — Esquema de Base de Datos
// REGLA: No modificar directamente la BD. Usar únicamente `prisma migrate dev`.

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMERACIONES
// ─────────────────────────────────────────────

enum Rol {
  SUPER_ADMIN   // Administrador Central del Sistema.
  PROPIETARIO   // Dueño legal del ganado y fincas Charolais.
  VETERINARIO   // Médico independiente. Cuenta única, multi-predio.
  OPERARIO      // Vaquero/Corralero fijo en un predio.
  CLIENTE       // Comprador o pasante con acceso de solo lectura.
}

enum Sexo {
  MACHO
  HEMBRA
}

enum EstadoAnimal {
  ACTIVO        // En predio, sin restricciones
  EN_RETIRO     // En periodo de retiro por tratamiento sanitario
  EN_TRANSITO   // Enviado temporalmente a una feria o predio externo
  VENDIDO       // Egresado por venta
  MUERTO        // Fallecido
}

enum EtapaProductiva {
  CRIA
  RECRIA
  REPRODUCCION
  REPRODUCTOR
  ENGORDE
  REEMPLAZO
  BAJA
}

enum TipoEventoSanitario {
  VACUNACION
  TRATAMIENTO
  DIAGNOSTICO
  DESPARASITACION
  CIRUGIA
}

enum TipoMovimiento {
  TRASLADO_INTERNO    // Cambio de lote/potrero dentro del mismo predio
  TRASLADO_EXTERNO    // Traslado a otro predio (requiere guía oficial)
  CAMBIO_PROPIETARIO  // Venta/transferencia de propiedad
  INGRESO             // Primer ingreso o reingreso al predio
  EGRESO_SACRIFICIO   // Salida a faena
}

enum TipoEventoReproductivo {
  MONTA_NATURAL
  INSEMINACION_ARTIFICIAL
  TRANSFERENCIA_EMBRION
  PARTO
  ABORTO
  SECADO
}

// ─────────────────────────────────────────────
// ENTIDADES CORE
// ─────────────────────────────────────────────

/// Propietario de un predio. Puede tener múltiples predios.
model Propietario {
  id        Int       @id @autoincrement
  nombre    String
  documento String    // Cédula o NIT
  telefono  String?
  email     String?
  direccion String?
  predios   Predio[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?            // Soft delete

  @@unique([documento, deletedAt])
  @@unique([email, deletedAt])
  @@map("propietarios")
}

// Nueva tabla satélite para generación segura del CUSA y reinicio anual
model SecuenciaPredio {
  id          Int      @id @autoincrement
  predioId    Int
  predio      Predio   @relation(fields: [predioId], references: [id])
  anio        Int
  secuencial  Int      @default(0)
  
  @@unique([predioId, anio])
  @@map("secuencias_predios")
}

/// Establecimiento ganadero (finca, hacienda). Unidad de gestión principal.
model Predio {
  id           Int         @id @autoincrement
  nombre       String
  /// Código oficial del predio alineado a las normativas de AGROCALIDAD
  codigo       String      @unique   
  municipio    String
  departamento String
  area         Float?                // Área en hectáreas
  propietarioId Int
  propietario  Propietario @relation(fields: [propietarioId], references: [id])
  animales     Animal[]
  usuarios     Usuario[]
  // Relación inversa para saber qué veterinarios tienen acceso a este predio
  veterinarios    Usuario[]    @relation("VeterinariosEnPredio")
  movimientosOrigen  Movimiento[] @relation("PredioOrigen")
  movimientosDestino Movimiento[] @relation("PredioDestino")
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?
  secuencias   SecuenciaPredio[]

  @@map("predios")
}

/// Usuario del sistema con rol asignado.
model Usuario {
  id           Int       @id @autoincrement
  nombre       String
  email        String
  passwordHash String
  rol          Rol

  // Relación para el dueño global
  propietarioId   Int?
  propietario     Propietario? @relation(fields: [propietarioId], references: [id])

  // Relación 1:N para personal fijo (Operario / Cliente atado a una finca)
  predioId        Int?
  predio          Predio?      @relation(fields: [predioId], references: [id])

  // Relación N:M EXCLUSIVA para el VETERINARIO (Puede trabajar en múltiples predios)
  prediosAsignados Predio[]    @relation("VeterinariosEnPredio")
  activo       Boolean   @default(true)
  estado       String    @default("PENDIENTE") // PENDIENTE, ACTIVO, RECHAZADO
  sesiones           SesionUsuario[]
  eventosCreados     EventoSanitario[]  @relation("EventoCreador")
  pesajesCreados     Pesaje[]           @relation("PesajeCreador")
  movimientosCreados Movimiento[]
  auditLogs          AuditLog[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  @@unique([email, deletedAt])
  @@map("usuarios")
}

/// Manejo de múltiples dispositivos/sesiones concurrentes (PWA + Desktop)
model SesionUsuario {
  id           Int      @id @autoincrement
  usuarioId    Int
  usuario      Usuario  @relation(fields: [usuarioId], references: [id])
  refreshToken String   @unique // Hashed refresh token
  dispositivo  String?
  ip           String?
  createdAt    DateTime @default(now())
  expiresAt    DateTime

  @@map("sesiones_usuarios")
}

/// Animal bovino individual. Entidad central del sistema.
model Animal {
  id              Int          @id @autoincrement
  /// Identificador primario de campo. EXACTAMENTE 10 dígitos numéricos. INMUTABLE.
  codigoVisual    String       
  /// Código Único de Sistema Animal (Generado auto: BOV-AÑO-PREDIO-SECUENCIAL)
  cusa            String       @unique
  nombre          String?
  raza            String
  sexo            Sexo
  fechaNacimiento DateTime?
  pesoNacimiento  Float?
  esToroCatalogo  Boolean      @default(false) // Permite registrar genética externa sin afectar inventario
  estado          EstadoAnimal @default(ACTIVO)
  etapaActual     EtapaProductiva  @default(CRIA)
  historialEtapas HistorialEtapa[]
  
  // Banderas dinámicas para estados temporales
  isGestante      Boolean      @default(false)
  
  // El estado de retiro se calculará dinámicamente:
  // (fechaFinRetiro > Date.now()) desde la tabla de EventosSanitarios
  predioId        Int
  predio          Predio       @relation(fields: [predioId], references: [id])

  // Genealogía (auto-referencial)
  madreId         Int?
  madre           Animal?  @relation("AnimalMadre", fields: [madreId], references: [id])
  hijosComoMadre  Animal[] @relation("AnimalMadre")
  padreId         Int?
  padre           Animal?  @relation("AnimalPadre", fields: [padreId], references: [id])
  hijosComoPadre  Animal[] @relation("AnimalPadre")

  // Relaciones a otros módulos
  eventosSanitarios    EventoSanitario[]
  pesajes              Pesaje[]
  movimientos          Movimiento[]
  eventosReproductivos EventoReproductivo[] @relation("AnimalEvento")
  nacimientosComoPadre EventoReproductivo[] @relation("PadreEvento")
  nacimientoComoTernero EventoReproductivo[] @relation("PartoTernero")

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // Soft delete

  // Resolución de anomalía: Índice único compuesto para permitir reutilizar 
  // un codigoVisual en diferentes predios, o si el animal fue eliminado.
  @@unique([codigoVisual, predioId, deletedAt])
  @@map("animales")
}

model HistorialEtapa {
  id              Int             @id @autoincrement
  animalId        Int
  animal          Animal          @relation(fields: [animalId], references: [id])
  etapaAnterior   EtapaProductiva
  etapaNueva      EtapaProductiva
  fecha           DateTime        @default(now())
  observaciones   String?

  @@map("historial_etapas")
}

// ─────────────────────────────────────────────
// MÓDULO 2 — HISTORIAL CLÍNICO
// ─────────────────────────────────────────────

/// Evento sanitario: vacunación, tratamiento, diagnóstico, etc.
model EventoSanitario {
  id                Int                 @id @autoincrement
  animalId          Int
  animal            Animal              @relation(fields: [animalId], references: [id])
  tipo              TipoEventoSanitario
  fecha             DateTime
  producto          String?
  principioActivo   String?
  dosis             String?
  viaAdministracion String?
  lote              String?
  laboratorio       String?
  /// Si > 0, calcula fechaFinRetiro y pone animal EN_RETIRO automáticamente.
  periodoRetiro     Int                 @default(0)
  fechaFinRetiro    DateTime?           // Calculado: fecha + periodoRetiro días
  diagnostico       String?
  observaciones     String?
  creadoPorId       Int
  creadoPor         Usuario             @relation("EventoCreador", fields: [creadoPorId], references: [id])
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@map("eventos_sanitarios")
}

// ─────────────────────────────────────────────
// MÓDULO 3 — PRODUCTIVIDAD, REPRODUCCIÓN Y MOVIMIENTO
// ─────────────────────────────────────────────

/// Registro cronológico de pesajes con condición corporal.
model Pesaje {
  id                Int      @id @autoincrement
  animalId          Int
  animal            Animal   @relation(fields: [animalId], references: [id])
  fecha             DateTime
  peso              Float    // kg
  perimetroToracico Float?   // cm
  longitudCorporal  Float?   // cm
  condicionCorporal Float?   // Escala 1.0 a 5.0 en pasos de 0.5
  operarioId        Int
  operario          Usuario  @relation("PesajeCreador", fields: [operarioId], references: [id])
  observaciones     String?
  createdAt         DateTime @default(now())
  
  // NOTA: Los campos `ganancia` y `gananciaDiaria` fueron eliminados. 
  // Se calcularán dinámicamente en la capa de servicios.
  @@map("pesajes")
}

/// Evento reproductivo: monta, inseminación, parto, aborto, etc.
model EventoReproductivo {
  id            Int                    @id @autoincrement
  animalId      Int                    // La hembra protagonista (actúa implícitamente como madre)
  animal        Animal                 @relation("AnimalEvento", fields: [animalId], references: [id])
  tipo          TipoEventoReproductivo
  fecha         DateTime
  padreId       Int?
  padre         Animal?                @relation("PadreEvento", fields: [padreId], references: [id])
  terneroId     Int?                   // FK al Animal creado en el parto
  ternero       Animal?                @relation("PartoTernero", fields: [terneroId], references: [id])
  resultado     String?
  observaciones String?
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt

  // NOTA: `madreId` y su relación asociada fueron ELIMINADOS por redundancia lógica.
  @@map("eventos_reproductivos")
}

/// Registro de traslados y cambios de propiedad con guía oficial.
model Movimiento {
  id              Int            @id @autoincrement
  animalId        Int
  animal          Animal         @relation(fields: [animalId], references: [id])
  tipo            TipoMovimiento
  fecha           DateTime
  predioOrigenId  Int?
  predioOrigen    Predio?        @relation("PredioOrigen", fields: [predioOrigenId], references: [id])
  predioDestinoId Int?
  predioDestino   Predio?        @relation("PredioDestino", fields: [predioDestinoId], references: [id])
  /// Obligatorio para TRASLADO_EXTERNO, CAMBIO_PROPIETARIO, EGRESO_SACRIFICIO.
  numeroGuia      String?
  motivoEgreso    String?
  pesoMovimiento  Float?
  creadoPorId     Int
  creadoPor       Usuario        @relation(fields: [creadoPorId], references: [id])
  observaciones   String?
  createdAt       DateTime       @default(now())

  @@map("movimientos")
}

// ─────────────────────────────────────────────
// AUDITORÍA
// ─────────────────────────────────────────────

/// Registro de auditoría para todas las operaciones críticas (CONSTITUTION §6.4)
model AuditLog {
  id        Int      @id @autoincrement
  usuarioId Int
  usuario   Usuario  @relation(fields: [usuarioId], references: [id])
  accion    String   // "CREATE_ANIMAL", "ANIMAL_EN_RETIRO", etc.
  entidad   String   // Nombre de la tabla afectada
  entidadId Int?
  datos     String?  // JSON serializado con los datos modificados
  ip        String?
  createdAt DateTime @default(now())

  @@map("audit_logs")
}
```

### 1.2 Diagrama Entidad-Relación (ERD)

```
┌──────────────────┐        ┌──────────────────┐
│   Propietario    │──1:N──▶│     Predio       │
└──────────────────┘        └────────┬─────────┘
                                     │ 1:N
                          ┌──────────▼─────────┐
                          │      Animal         │◀──────┐ (madreId/padreId)
                          │  codigoVisual 10d  │───────┘
                          └──┬──────┬──────┬───┘
                             │1:N   │1:N   │1:N
              ┌──────────────┘      │      └─────────────────┐
              │                     │                         │
   ┌──────────▼──────┐   ┌──────────▼──────┐   ┌────────────▼──────────┐
   │EventoSanitario  │   │    Pesaje        │   │  EventoReproductivo   │
   │ periodoRetiro   │   │ condicionCorporal│   │  parto→crea Animal    │
   │ fechaFinRetiro  │   │ ganancia(calc.)  │   │  RN-003               │
   └─────────────────┘   └─────────────────┘   └───────────────────────┘
              │1:N
   ┌──────────▼──────┐
   │   Movimiento    │
   │  numeroGuia     │
   │  bloqueado si   │
   │  EN_RETIRO      │
   └─────────────────┘

   [Usuario]──N:1──[Predio]      [AuditLog]──N:1──[Usuario]
```

---

## 2. Arquitectura de la API REST

### 2.1 Convenciones Globales

| Aspecto       | Convención                                                          |
|---------------|---------------------------------------------------------------------|
| Base URL      | `/api/v1`                                                           |
| Auth          | `Authorization: Bearer <JWT>` en todos los endpoints privados       |
| Formato       | JSON (`Content-Type: application/json`)                             |
| Paginación    | Query params: `?page=1&limit=20`                                    |
| Fechas        | ISO 8601: `2026-06-18T00:00:00.000Z`                               |
| IDs           | Enteros auto-incrementales                                          |

### 2.2 Estructura de Respuestas

```typescript
// Éxito — 200/201
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 150 } }

// Error — 4xx/5xx
{ "success": false, "error": { "code": "ANIMAL_NOT_FOUND", "message": "..." } }
```

### 2.3 Códigos HTTP

| Código | Cuándo                                                  |
|--------|---------------------------------------------------------|
| 200    | GET, PATCH, DELETE exitosos                             |
| 201    | POST que crea un recurso                                |
| 400    | Error de validación Zod                                 |
| 401    | Token ausente, inválido o expirado                      |
| 403    | Rol insuficiente (RBAC)                                 |
| 404    | Recurso no encontrado                                   |
| 409    | Conflicto: duplicado (ej: codigoVisual)                 |
| 422    | Regla de negocio violada (retiro activo, inmutabilidad) |
| 429    | Rate limit excedido                                     |
| 500    | Error interno del servidor                              |

---

## 3. Módulo 1 — Identificación y Registro Base

### 3.1 Autenticación — `/api/v1/auth`

| Método | Endpoint               | Descripción                               | Auth |
|--------|------------------------|-------------------------------------------|------|
| POST   | `/auth/login`          | Autenticar usuario → JWT + cookie refresh | ❌    |
| POST   | `/auth/refresh`        | Renovar access token con refresh cookie   | ❌    |
| POST   | `/auth/logout`         | Invalidar refresh token                   | ✅    |
| GET    | `/auth/me`             | Perfil del usuario autenticado            | ✅    |

**Request Body `POST /auth/login`:**
```json
{ "email": "admin@finca-lapaz.co", "password": "M1C0ntr@seña123" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "expiresIn": 28800,
    "user": {
      "id": 1, "nombre": "Carlos Pérez", "email": "admin@finca-lapaz.co",
      "rol": "ADMIN", "predioId": 1, "predioNombre": "Finca La Paz"
    }
  }
}
```
> Refresh token retornado en cookie `httpOnly; Secure; SameSite=Strict`.

---

### 3.2 Propietarios — `/api/v1/propietarios`

| Método | Endpoint                   | Descripción                               | Roles |
|--------|----------------------------|-------------------------------------------|-------|
| GET    | `/propietarios`            | Listar propietarios (paginado)            | ADMIN |
| POST   | `/propietarios`            | Crear propietario                         | ADMIN |
| GET    | `/propietarios/:id`        | Obtener con sus predios                   | ADMIN |
| PATCH  | `/propietarios/:id`        | Actualizar datos                          | ADMIN |
| DELETE | `/propietarios/:id`        | Soft delete (sin predios activos)         | ADMIN |

**Body POST:**
```json
{
  "nombre": "Carlos Pérez Rodríguez", "documento": "12345678",
  "telefono": "3001234567", "email": "carlos@email.com",
  "direccion": "Vereda El Porvenir, Km 5"
}
```

---

### 3.3 Predios — `/api/v1/predios`

| Método | Endpoint               | Descripción                                   | Roles              |
|--------|------------------------|-----------------------------------------------|--------------------|
| GET    | `/predios`             | Listar predios del usuario autenticado        | ADMIN              |
| POST   | `/predios`             | Crear nuevo predio                            | ADMIN              |
| GET    | `/predios/:id`         | Predio con resumen de animales                | ADMIN, VET, OPER   |
| PATCH  | `/predios/:id`         | Actualizar datos del predio                   | ADMIN              |
| DELETE | `/predios/:id`         | Soft delete (sin animales activos)            | ADMIN              |
| GET    | `/predios/:id/stats`   | Estadísticas: totales por estado/raza/sexo    | ADMIN, VET         |

**Body POST:**
```json
{
  "nombre": "Finca La Paz", "codigo": "ANT-05-001",
  "municipio": "El Santuario", "departamento": "Antioquia",
  "area": 120.5, "propietarioId": 1
}
```

---

### 3.4 Usuarios — `/api/v1/usuarios`

| Método | Endpoint                         | Descripción                       | Roles |
|--------|----------------------------------|-----------------------------------|-------|
| GET    | `/usuarios`                      | Listar usuarios del predio        | ADMIN |
| POST   | `/usuarios`                      | Crear usuario con rol             | ADMIN |
| GET    | `/usuarios/:id`                  | Obtener usuario                   | ADMIN |
| PATCH  | `/usuarios/:id`                  | Actualizar datos / cambiar rol    | ADMIN |
| PATCH  | `/usuarios/:id/toggle`           | Activar/desactivar cuenta         | ADMIN |
| POST   | `/usuarios/change-password`      | Cambiar contraseña propia         | Todos |

**Body POST:**
```json
{
  "nombre": "María López", "email": "maria@finca-lapaz.co",
  "password": "Pasw0rd.Segur@", "rol": "VETERINARIO", "predioId": 1
}
```

---

### 3.5 Animales — `/api/v1/animales`

| Método | Endpoint                                | Descripción                                        | Roles                 |
|--------|-----------------------------------------|----------------------------------------------------|-----------------------|
| GET    | `/animales`                             | Listar con filtros y paginación                    | ADMIN, VET, OPER, EST |
| POST   | `/animales`                             | Registrar nuevo animal                             | ADMIN, VET, OPER      |
| GET    | `/animales/:id`                         | Obtener animal con datos completos                 | Todos                 |
| GET    | `/animales/codigo/:codigoVisual`        | Buscar por código visual (uso en campo)            | Todos                 |
| PATCH  | `/animales/:id`                         | Actualizar (codigoVisual bloqueado)                | ADMIN, VET            |
| DELETE | `/animales/:id`                         | Soft delete                                        | ADMIN                 |

**Filtros disponibles `GET /animales`:**
```
?page=1&limit=20
&estado=ACTIVO|EN_RETIRO|GESTANTE|VENDIDO|MUERTO
&sexo=MACHO|HEMBRA
&raza=Holstein
&predioId=1
&search=<nombre o codigoVisual>
&sortBy=codigoVisual|fechaNacimiento|updatedAt
&sortOrder=asc|desc
```

**Body POST — Crear Animal:**
```json
{
  "codigoVisual": "1234567890",
  "nombre": "Estrella",
  "raza": "Holstein",
  "sexo": "HEMBRA",
  "fechaNacimiento": "2024-03-15",
  "pesoNacimiento": 38.5,
  "predioId": 1,
  "madreId": 5,
  "padreId": 12
}
```

> **⚠️ REGLA CRÍTICA — RN-001**: El campo `codigoVisual` está **PROHIBIDO** en `PATCH /animales/:id`.
> Si se incluye → `HTTP 422` con código `CODIGO_VISUAL_IMMUTABLE`.

---

### 3.6 Restricción Global de Estados (State Machine)
Para garantizar la coherencia lógica de los datos de campo, se implementa una restricción transversal en las rutas de los Módulos 2 (Sanidad) y 3 (Productividad, Reproducción y Movimiento).

* **Estados Operativos (Permitidos):** `ACTIVO`, `EN_RETIRO`, `GESTANTE`.
* **Estados Terminales (Bloqueados):** `VENDIDO`, `MUERTO`.

Ningún animal en estado terminal puede recibir nuevos registros operativos, a excepción de correcciones administrativas (mediante rol ADMIN) sobre registros pasados.

---

### 3.7 Validación de Sexo en Genealogía
Todo registro o actualización de un animal que incluya datos genealógicos debe validar estrictamente a nivel de base de datos que el `madreId` corresponda a un animal con sexo `HEMBRA` y el `padreId` a un animal con sexo `MACHO`. El incumplimiento retorna HTTP 422.

---

## 4. Módulo 2 — Historial Clínico y Control Sanitario

### 4.1 Eventos Sanitarios — `/api/v1/animales/:animalId/eventos`

| Método | Endpoint                              | Descripción                             | Roles           |
|--------|---------------------------------------|-----------------------------------------|-----------------|
| GET    | `/animales/:animalId/eventos`         | Historial sanitario del animal          | Todos           |
| POST   | `/animales/:animalId/eventos`         | Registrar evento sanitario              | ADMIN, VET      |
| POST   | `/eventos/lote`                       | Registrar evento masivo (múltiples)     | ADMIN, VET      |
| GET    | `/animales/:animalId/eventos/:id`     | Detalle de un evento                    | Todos           |
| PATCH  | `/animales/:animalId/eventos/:id`     | Corregir evento (auditoría)             | ADMIN, VET      |
| DELETE | `/animales/:animalId/eventos/:id`     | Eliminar evento                         | ADMIN           |

**Body POST — Tratamiento con Período de Retiro:**
```json
{
  "tipo": "TRATAMIENTO",
  "fecha": "2026-06-18T08:00:00Z",
  "producto": "Oxitetraciclina LA",
  "principioActivo": "Oxitetraciclina",
  "dosis": "1ml/10kg",
  "viaAdministracion": "IM",
  "lote": "OXI-2026-001",
  "laboratorio": "Pfizer Animal Health",
  "periodoRetiro": 28,
  "observaciones": "Tratamiento por neumonía leve."
}
```

**Response 201 — Con cálculo automático de retiro:**
```json
{
  "success": true,
  "data": {
    "id": 45,
    "animalId": 87,
    "tipo": "TRATAMIENTO",
    "periodoRetiro": 28,
    "fechaFinRetiro": "2026-07-16T08:00:00.000Z",
    "animal": {
      "id": 87,
      "codigoVisual": "1234567890",
      "estado": "EN_RETIRO",
      "alertaRetiro": {
        "activa": true,
        "diasRestantes": 28,
        "fechaLibre": "2026-07-16T08:00:00.000Z"
      }
    }
  }
}
```

> **🔴 RN-002**: `fechaFinRetiro` y cambio a `EN_RETIRO` ocurren en una **transacción Prisma atómica**.
> Ver detalle en [Sección 9](#9-reglas-de-negocio-críticas).

### 4.2 Búsqueda Global de Eventos — `/api/v1/eventos-sanitarios`

| Método | Endpoint                   | Descripción                             | Roles      |
|--------|----------------------------|-----------------------------------------|------------|
| GET    | `/eventos-sanitarios`      | Eventos con filtros globales por predio | ADMIN, VET |

**Filtros:**
```
?tipo=TRATAMIENTO|VACUNACION|DIAGNOSTICO
&predioId=1&fechaDesde=2026-01-01&fechaHasta=2026-06-18
&conRetiroActivo=true
&animalId=87&producto=Oxitetraciclina
&page=1&limit=20
```

### 4.3 Fallecimiento y Bajas (NUEVO)
| Método | Endpoint                              | Descripción                                  | Roles      |
|--------|---------------------------------------|----------------------------------------------|------------|
| POST   | `/animales/:animalId/fallecimiento`   | Registrar baja por muerte natural/enfermedad | ADMIN, VET |

**Body POST:**
```json
{
  "fecha": "2026-06-26T14:30:00Z",
  "causa": "Enfermedad respiratoria",
  "observaciones": "El animal no respondió al tratamiento."
}
```
> **Efecto Atómico:** Cambia el estado del animal a `MUERTO`, la etapa a `BAJA` (generando su `HistorialEtapa`), registra la causa y genera un registro en `AuditLog`.

---

## 5. Módulo 3 — Productividad, Reproducción y Movimiento

### 5.1 Pesajes — `/api/v1/animales/:animalId/pesajes`

| Método | Endpoint                                  | Descripción                                  | Roles                 |
|--------|-------------------------------------------|----------------------------------------------|-----------------------|
| GET    | `/animales/:animalId/pesajes`             | Historial cronológico de pesajes             | Todos                 |
| POST   | `/animales/:animalId/pesajes`             | Registrar nuevo pesaje                       | ADMIN, VET, OPER      |
| PATCH  | `/animales/:animalId/pesajes/:id`         | Corregir pesaje                              | ADMIN                 |
| DELETE | `/animales/:animalId/pesajes/:id`         | Eliminar pesaje                              | ADMIN                 |

**Body POST:**
```json
{
  "fecha": "2026-06-18T07:30:00Z",
  "peso": 320.5,
  "condicionCorporal": 3.5,
  "observaciones": "Animal con buen desarrollo."
}
```

**Response 201 — Con ganancia calculada (RN-004):**
```json
{
  "success": true,
  "data": {
    "id": 23, "animalId": 87, "peso": 320.5, "condicionCorporal": 3.5,
    "ganancia": 45.5, "gananciaDiaria": 0.75, "diasDesdeUltimoPesaje": 61,
    "pesajeAnterior": { "fecha": "2026-04-18T00:00:00.000Z", "peso": 275.0 }
  }
}
```

---

### 5.2 Reproducción — `/api/v1/animales/:animalId/reproduccion`

| Método | Endpoint                                        | Descripción                                  | Roles      |
|--------|-------------------------------------------------|----------------------------------------------|------------|
| GET    | `/animales/:animalId/reproduccion`              | Historial reproductivo                       | Todos      |
| POST   | `/animales/:animalId/reproduccion`              | Registrar evento reproductivo                | ADMIN, VET |
| POST   | `/animales/:animalId/reproduccion/parto`        | Registrar parto + crear ternero (RN-003)     | ADMIN, VET |

**Body POST `/parto`:**
```json
{
  "fecha": "2026-06-18T03:00:00Z",
  "padreId": 12,
  "ternero": {
    "codigoVisual": "0987654321",
    "sexo": "MACHO",
    "pesoNacimiento": 35.0,
    "nombre": "Toro Nuevo"
  },
  "resultado": "Parto eutócico, ternero vivo",
  "observaciones": "Sin complicaciones."
}
```

> **Transacción atómica RN-003**: crea EventoReproductivo + Animal ternero (madreId/padreId automáticos) + actualiza estado madre + AuditLog. Rollback total si cualquier paso falla.

---

### 5.3 Movimientos — `/api/v1/animales/:animalId/movimientos`

| Método | Endpoint                              | Descripción                                  | Roles      |
|--------|---------------------------------------|----------------------------------------------|------------|
| GET    | `/animales/:animalId/movimientos`     | Línea de tiempo de movimientos               | Todos      |
| POST   | `/animales/:animalId/movimientos`     | Registrar traslado / cambio de propiedad     | ADMIN, VET |
| GET    | `/movimientos`                        | Listado global de movimientos por predio     | ADMIN      |

**Body POST — Traslado Externo:**
```json
{
  "tipo": "TRASLADO_EXTERNO",
  "fecha": "2026-06-18T10:00:00Z",
  "predioOrigenId": 1,
  "predioDestinoId": 3,
  "numeroGuia": "GU-ANT-2026-00145",
  "pesoMovimiento": 320.5,
  "observaciones": "Traslado a finca de engorde."
}
```

> **Validación**: `numeroGuia` obligatorio si `tipo` ∈ {`TRASLADO_EXTERNO`, `CAMBIO_PROPIETARIO`, `EGRESO_SACRIFICIO`}.
> **Bloqueo**: Si `animal.estado === "EN_RETIRO"` → `HTTP 422` código `ANIMAL_EN_RETIRO_BLOQUEADO`.

---

## 6. Módulo 4 — Consulta e Informes

### 6.1 Hoja de Vida Integral — Endpoint Principal de Campo

| Método | Endpoint                                       | Descripción                                 | Roles |
|--------|------------------------------------------------|---------------------------------------------|-------|
| GET    | `/animales/:id/hoja-de-vida`                   | Hoja de vida completa por ID                | Todos |
| GET    | `/animales/codigo/:codigoVisual/hoja-de-vida`  | Hoja de vida por código visual              | Todos |

**Response 200 — Hoja de Vida:**
```json
{
  "success": true,
  "data": {
    "animal": {
      "id": 87, "codigoVisual": "1234567890", "nombre": "Estrella",
      "raza": "Holstein", "sexo": "HEMBRA", "estado": "EN_RETIRO",
      "edad": { "años": 2, "meses": 3, "dias": 3 },
      "pesoActual": 320.5,
      "predio": { "id": 1, "nombre": "Finca La Paz" }
    },
    "alertas": [
      {
        "tipo": "RETIRO_ACTIVO",
        "severidad": "CRITICA",
        "color": "#dc2626",
        "mensaje": "Animal en período de retiro. Libre el 16/07/2026.",
        "diasRestantes": 28,
        "producto": "Oxitetraciclina LA",
        "fechaLibre": "2026-07-16T08:00:00.000Z",
        "movimientosBloqueados": ["TRASLADO_EXTERNO", "EGRESO_SACRIFICIO", "CAMBIO_PROPIETARIO"]
      }
    ],
    "genealogia": {
      "madre": { "id": 5, "codigoVisual": "0000000001", "nombre": "Lucera" },
      "padre": { "id": 12, "codigoVisual": "0000000002", "nombre": "Zeus" },
      "hijos": []
    },
    "ultimoPesaje": { "fecha": "2026-06-18T07:30:00.000Z", "peso": 320.5, "condicionCorporal": 3.5, "ganancia": 45.5 },
    "lineaDeTiempo": [
      {
        "fecha": "2026-06-18T08:00:00.000Z", "tipo": "EVENTO_SANITARIO",
        "icono": "🔴", "titulo": "Tratamiento — Oxitetraciclina LA",
        "descripcion": "Vía IM. Retiro: 28 días.", "categoria": "SANITARIO"
      },
      {
        "fecha": "2026-06-18T07:30:00.000Z", "tipo": "PESAJE",
        "icono": "⚖️", "titulo": "Pesaje: 320.5 kg",
        "descripcion": "CC: 3.5/5. Ganancia: +45.5 kg.", "categoria": "PRODUCTIVIDAD"
      },
      {
        "fecha": "2024-03-15T00:00:00.000Z", "tipo": "NACIMIENTO",
        "icono": "🐄", "titulo": "Nacimiento registrado",
        "descripcion": "Peso al nacer: 38.5 kg.", "categoria": "REGISTRO"
      }
    ],
    "resumenSanitario": {
      "totalVacunaciones": 4, "totalTratamientos": 2, "totalDiagnosticos": 1,
      "enRetiroActivo": true
    },
    "resumenProductivo": {
      "totalPesajes": 5, "pesoMaximo": 320.5, "pesoMinimo": 38.5,
      "gananciaTotalKg": 282.0, "gdpPromedio": 0.43
    }
  }
}
```

---

### 6.2 Reportes — `/api/v1/reportes`

| Método | Endpoint                            | Descripción                              | Roles            |
|--------|-------------------------------------|------------------------------------------|------------------|
| GET    | `/reportes/inventario`              | Inventario completo del predio           | ADMIN, VET       |
| GET    | `/reportes/sanitario`               | Reporte sanitario por período            | ADMIN, VET       |
| GET    | `/reportes/animales-en-retiro`      | Animales actualmente en retiro 🔴        | Todos            |
| GET    | `/reportes/pesajes`                 | Ganancias de masa por período            | ADMIN, VET, OPER |
| GET    | `/reportes/movimientos`             | Traslados en un período                  | ADMIN            |
| POST   | `/reportes/exportar`                | Exportar a PDF o CSV                     | ADMIN, VET       |

**Query Params comunes:**
```
?predioId=1&fechaDesde=2026-01-01&fechaHasta=2026-06-18&formato=json|csv|pdf
```

---

### 6.3 Manejo de Soft Delete en Genealogía
Las consultas a la base de datos para construir el árbol genealógico (`madre` y `padre`) DEBEN incluir los registros donde `deletedAt != null`. En el frontend, si un progenitor fue eliminado lógicamente, se mostrará con un indicador visual (ej. `[ELIMINADO]`) para no romper el historial del descendiente.

### 6.4 Arquitectura del Árbol Genealógico (Limitación Técnica Prisma)
El endpoint responsable de renderizar el árbol genealógico (`GET /api/v1/animales/:id/arbol`) **no utilizará** el Query Builder nativo de Prisma. Dado que Prisma no soporta consultas recursivas nativas de profundidad infinita, el backend ejecutará una consulta SQL pura mediante `prisma.$queryRaw`. Esta consulta empleará **CTEs Recursivas (Common Table Expressions)** nativas de SQLite para ascender por el árbol de `madreId` y `padreId` de manera optimizada, forzando la inclusión de registros con `deletedAt != null` (Soft Delete).

---

## 7. Esquemas de Validación Zod

```typescript
// backend/src/validators/animal.validator.ts
import { z } from 'zod';

/** REGLA CRÍTICA: exactamente 10 dígitos numéricos */
export const codigoVisualSchema = z
  .string({
    required_error: 'El código visual es obligatorio.',
    invalid_type_error: 'El código visual debe ser texto.',
  })
  .length(10, 'El código visual debe tener exactamente 10 dígitos.')
  .regex(/^\d{10}$/, 'El código visual debe contener únicamente dígitos numéricos (0-9).');

export const animalCreateSchema = z.object({
  codigoVisual: codigoVisualSchema,
  nombre: z.string().max(100).optional(),
  raza: z.string().min(1, 'La raza es obligatoria.').max(100),
  sexo: z.enum(['MACHO', 'HEMBRA'], { required_error: 'El sexo es obligatorio.' }),
  fechaNacimiento: z.coerce.date().optional(),
  pesoNacimiento: z.number().positive().optional(),
  predioId: z.number().int().positive(),
  madreId: z.number().int().positive().optional(),
  padreId: z.number().int().positive().optional(),
  registrarIngreso: z.boolean().optional().default(false),
  numeroGuiaIngreso: z.string().optional(), // Obligatorio si registrarIngreso es true y proviene de otro predio
  isGestante: z.boolean().optional().default(false)
});

/** PATCH: codigoVisual NUNCA puede modificarse */
// Validar en el servicio de actualización (PATCH):
// No se permite modificar el sexo si el animal tiene registros dependientes en madreId o padreId.
export const animalUpdateSchema = animalCreateSchema
  .omit({ codigoVisual: true, predioId: true })
  .partial();

// ─────────────────────────────────────────────
// backend/src/validators/health.validator.ts

export const eventoSanitarioCreateSchema = z.object({
  tipo: z.enum(['VACUNACION', 'TRATAMIENTO', 'DIAGNOSTICO', 'DESPARASITACION', 'CIRUGIA']),
  fecha: z.coerce.date({ required_error: 'La fecha del evento es obligatoria.' }),
  producto: z.string().max(200).optional(),
  principioActivo: z.string().max(200).optional(),
  dosis: z.string().max(50).optional(),
  viaAdministracion: z.string().max(50).optional(),
  lote: z.string().max(100).optional(),
  laboratorio: z.string().max(200).optional(),
  periodoRetiro: z.number().int().min(0).default(0),
  diagnostico: z.string().max(500).optional(),
  observaciones: z.string().max(1000).optional(),
});

// ─────────────────────────────────────────────
// backend/src/validators/pesaje.validator.ts

export const pesajeCreateSchema = z.object({
  fecha: z.coerce.date({ required_error: 'La fecha del pesaje es obligatoria.' }),
  peso: z
    .number({ required_error: 'El peso es obligatorio.' })
    .positive('El peso debe ser positivo.')
    .max(2000, 'El peso no puede superar los 2000 kg.'),
  condicionCorporal: z
    .number()
    .min(1, 'Mínimo 1.0').max(5, 'Máximo 5.0')
    .multipleOf(0.5, 'Valores en pasos de 0.5 (1.0, 1.5, 2.0, ...)')
    .optional(),
  observaciones: z.string().max(500).optional(),
});

// ─────────────────────────────────────────────
// backend/src/validators/movimiento.validator.ts

export const movimientoCreateSchema = z.object({
  tipo: z.enum([
    'TRASLADO_INTERNO', 'TRASLADO_EXTERNO',
    'CAMBIO_PROPIETARIO', 'INGRESO', 'EGRESO_SACRIFICIO',
  ]),
  fecha: z.coerce.date(),
  predioOrigenId: z.number().int().positive().optional(),
  predioDestinoId: z.number().int().positive().optional(),
  numeroGuia: z.string().max(100).optional(),
  pesoMovimiento: z.number().positive().optional(),
  motivoEgreso: z.string().max(500).optional(),
  observaciones: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  // guía obligatoria para movimientos externos
  const requiereGuia = ['TRASLADO_EXTERNO', 'CAMBIO_PROPIETARIO', 'EGRESO_SACRIFICIO'];
  if (requiereGuia.includes(data.tipo) && !data.numeroGuia) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['numeroGuia'],
      message: `Número de guía oficial obligatorio para "${data.tipo}".`,
    });
  }
});

// ─────────────────────────────────────────────
// backend/src/validators/auth.validator.ts

export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

export const createUsuarioSchema = z.object({
  nombre: z.string().min(2).max(200),
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres.')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Debe contener mayúscula, minúscula, número y carácter especial.'
    ),
  rol: z.enum(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO', 'CLIENTE']),
  predioId: z.number().int().positive(),
});
```

---

## 8. Matriz RBAC Detallada — [JERARQUÍA ESTRICTA]

### Definición de Roles
1. **SUPER_ADMIN**: Propietario del Software. Visibilidad global del sistema. Gestiona la creación de Propietarios (clientes).
2. **PROPIETARIO**: Dueño de Predio(s). Administra sus fincas, animales y personal (Veterinarios/Operarios). 
3. **VETERINARIO / OPERARIO / CLIENTE**: Usuarios operativos vinculados a Predios mediante el PROPIETARIO.

LEYENDA: ✅ Acceso Total (Global) | 👑 Admin Predio (Propietario) | ✏️ Clínica/Campo (Vet/Op) | 👁️ Solo Lectura

──────────────────────────────────┬─────────────┬─────────────┬─────────────┬────────────┬─────────────
RECURSO / ACCIÓN                  │ SUPER_ADMIN │ PROPIETARIO │ VETERINARIO │ OPERARIO   │ CLIENTE    
──────────────────────────────────┼─────────────┼─────────────┼─────────────┼────────────┼─────────────
Auth: Login                       │ ✅           │ ✅           │ ✅           │ ✅          │ ✅          
Sistema: Control Global           │ ✅           │ ❌          │ ❌          │ ❌          │ ❌          
Predios: Gestión (CRUD)           │ ✅           │ 👑 (Propio) │ ❌          │ ❌          │ ❌          
Usuarios: Gestión Staff (Finca)   │ ✅           │ 👑 (Staff)  │ ❌          │ ❌          │ ❌          
Animales: Gestión CRUD            │ ✅           │ 👑          │ ✏️ (Clínica)│ 📝 (Campo)  │ 👁️          
Eventos Sanitarios                │ ✅           │ 👑          │ ✏️          │ 📝         │ 👁️          
Reportes: Financieros/Productivos │ ✅           │ 👑          │ 👁️ (Local)  │ ❌          │ 👁️          
──────────────────────────────────┴─────────────┴─────────────┴─────────────┴────────────┴─────────────

### Regla de Protección Multi-Predio (RN-030)
Para los roles VETERINARIO, OPERARIO y CLIENTE, el backend DEBE implementar un filtro `where` en cada consulta:
  - Solo pueden acceder a datos donde `animal.predioId` o `evento.predioId` esté dentro de su lista de `prediosAsignados`.
  - El SUPER_ADMIN está exento de este filtro.
  - El PROPIETARIO está restringido a sus propios predios mediante su `propietarioId`.

---

## 9. Reglas de Negocio Críticas

### RN-001 — Código Visual Inmutable

```
TRIGGER: PATCH /api/v1/animales/:id con campo `codigoVisual` en body
RESPUESTA: HTTP 422
CÓDIGO: "CODIGO_VISUAL_IMMUTABLE"
MENSAJE: "El código visual no puede modificarse una vez registrado."

EXCEPCIÓN ADMIN: PATCH /api/v1/animales/:id/corregir-codigo
  → Requiere body: { codigoVisual: string, justificacion: string }
  → Solo ROL ADMIN
  → Registra AuditLog obligatorio con justificacion
```

### RN-002 — Período de Retiro y Bloqueo de Movimientos

```
TRIGGER: POST /api/v1/animales/:id/eventos (periodoRetiro > 0)

TRANSACCIÓN ATÓMICA (EventoSanitarioService.create):
  1. fechaFinRetiro = evento.fecha + (periodoRetiro días en ms)
  2. INSERT EventoSanitario con fechaFinRetiro
  3. INSERT AuditLog { accion: "ANIMAL_EN_RETIRO", datos: { producto, fechaFinRetiro } }

CÁLCULO DINÁMICO (Capa de Servicios):
  Un animal se considera "EN_RETIRO" (estado virtual) si existe al menos un EventoSanitario
  asociado cuya `fechaFinRetiro` sea mayor a `Date.now()`.
  Para calcular la `fechaLibre` y los `diasRestantes` (en UI y Backend), el sistema DEBE
  utilizar el `MAX(fechaFinRetiro)` de todos los eventos del animal.

BLOQUEO EN POST /movimientos:
  IF (animal.isEnRetiro() === true &&
      tipo IN ["TRASLADO_EXTERNO", "CAMBIO_PROPIETARIO", "EGRESO_SACRIFICIO"]):
    HTTP 422, código: "ANIMAL_EN_RETIRO_BLOQUEADO"

UI:
  - Badge: bg-danger/20 text-danger border-danger (#dc2626)
  - Banner de alerta roja en Hoja de Vida
  - Botones de traslado/egreso deshabilitados con tooltip
  - Contador de días restantes actualizado en tiempo real
```

### RN-003 — Registro de Parto (Creación Atómica de Ternero) [ACTUALIZACIÓN COMPLETA]
```text
TRIGGER: POST /api/v1/animales/:animalId/reproduccion/parto

ALGORITMO (ReproduccionService.registrarParto):
  1. Inferir Paternidad: Buscar el último EventoReproductivo de entrada (MONTA_NATURAL, INSEMINACION_ARTIFICIAL, TRANSFERENCIA_EMBRION) de la hembra. Obtener el `padreId` de ese evento (ignorar el `padreId` enviado en el body para prevenir error humano).
  2. Validar codigoVisual ternero: 10 dígitos, único.
  3. INSERT Animal ternero { madreId: animalId, padreId: padreInferido, predioId: madre.predioId, pesoNacimiento: body.pesoNacimiento, ... }
  4. INSERT EventoReproductivo { tipo: PARTO, terneroId: ternero.id, animalId: animalId }
  5. Sincronización Inicial de Peso: IF (body.pesoNacimiento != null) THEN INSERT Pesaje { animalId: ternero.id, peso: body.pesoNacimiento, fecha: body.fecha, observaciones: "Peso al nacer" }
  6. UPDATE Animal (madre): SET isGestante = false
  7. INSERT AuditLog
  ROLLBACK TOTAL si cualquier paso falla.
```

### RN-010 — Sincronización de Peso Inicial (NUEVO)
```text
TRIGGER: POST /api/v1/animales

ALGORITMO (AnimalService.create):
  Si el payload de creación de un animal incluye `pesoNacimiento` válido, el sistema debe insertar automáticamente en la misma transacción atómica:
  INSERT Pesaje {
    animalId: nuevoAnimal.id,
    peso: body.pesoNacimiento,
    fecha: body.fechaNacimiento o Date.now(),
    observaciones: "Registro de peso inicial del sistema"
  }
```

### RN-004 — Cálculo de Ganancia de Masa en Pesaje (ACTUALIZACIÓN COMPLETA)
```text
ALGORITMO (PesajeService - Cálculos Virtuales):
  La ganancia de peso y ganancia diaria NO se almacenan en base de datos.
  Al invocar GET /pesajes o GET /hoja-de-vida, el backend calcula dinámicamente estos valores iterando sobre la lista de pesajes ordenados cronológicamente, restando el peso del registro actual contra el inmediatamente anterior.
  PROTECCIÓN MATEMÁTICA: Para prevenir crashes de división por cero (ej: dos pesajes el mismo día), el cálculo debe usar: `diasTranscurridos = Math.max(1, diferenciaEnDias)`.
```

### RN-005 — Generación Automática del CUSA (ACTUALIZACIÓN COMPLETA)
```text
Soporte Offline-First y Concurrencia (Backend):
El CUSA solo será generado por el Backend en el momento de la sincronización. En el frontend (offline), el animal se identificará temporalmente por un UUID local.

ALGORITMO (AnimalService.create):
  1. Obtener el año actual (ej: "2026").
  2. Obtener el `codigo` del Predio relacionado.
  3. Ejecutar transacción atómica en `SecuenciaPredio`: 
     Búsqueda por `[predioId, anio]`. Si no existe el año actual, crearla con secuencial 1.
     Si existe, usar concurrencia segura de Prisma (`increment: 1`).
  4. Formatear secuencial con padding de 4 dígitos (ej: "0016").
  5. Concatenar: "BOV" + "-" + AÑO + "-" + CODIGO_PREDIO + "-" + SECUENCIAL.
  6. Asignar al campo `cusa` antes de guardar el Animal.
```

### RN-006 — Bloqueo de Operaciones en Estados Terminales (NUEVO)

```text
TRIGGER: POST / PATCH en endpoints de `/eventos`, `/pesajes`, `/reproduccion`

VALIDACIÓN (Capa de Servicios):
  1. Consultar el `estado` actual del animal referenciado.
  2. IF (estado === "VENDIDO" OR estado === "MUERTO"):
       ABORTAR la transacción.
       RETORNAR HTTP 422 Unprocessable Entity.
       CÓDIGO: "ANIMAL_ESTADO_TERMINAL"
       MENSAJE: "Operación denegada. El animal se encuentra inactivo (Vendido o Muerto)."
```

### RN-013 — Validación de Sexo en Reproducción (NUEVO)

```text
TRIGGER: POST /api/v1/animales/:animalId/reproduccion

VALIDACIÓN (Capa de Servicios):
  1. Consultar el `sexo` del animal referenciado (`animalId`).
  2. IF (sexo === "MACHO"):
       ABORTAR la transacción.
       RETORNAR HTTP 422 Unprocessable Entity.
       CÓDIGO: "EVENTO_REPRODUCTIVO_SEXO_INVALIDO"
       MENSAJE: "No se pueden registrar eventos reproductivos primarios (Parto, Inseminación, etc.) en un Macho."
```

### RN-015 — Alerta de Consanguinidad (NUEVO)

```text
TRIGGER: POST /api/v1/animales/:animalId/reproduccion

VALIDACIÓN (Capa de Servicios):
  Si el tipo es MONTA_NATURAL o INSEMINACION_ARTIFICIAL y se envía `padreId`:
  1. Obtener la genealogía de la hembra (padreId y madreId).
  2. IF (evento.padreId === hembra.padreId OR evento.padreId === hembra.madreId):
       ABORTAR la transacción.
       RETORNAR HTTP 422 Unprocessable Entity.
       CÓDIGO: "RIESGO_CONSANGUINIDAD"
       MENSAJE: "Inseminación bloqueada por riesgo genético. El toro es pariente de 1er grado."
```

### RF-04 — Gestación, Alertas y Reversión (ACTUALIZACIÓN COMPLETA)
```text
TRIGGER: POST /api/v1/animales/:animalId/reproduccion 

ALGORITMO DE ENTRADA:
  1. Validar estado actual: IF (isGestante === true) -> ABORTAR (HTTP 422: "ANIMAL_YA_GESTANTE").
  2. Validar etapa productiva: IF (etapaActual NOT IN ["RECRIA", "REEMPLAZO", "REPRODUCCION", "REPRODUCTOR"]) -> ABORTAR (HTTP 422: "ETAPA_INVALIDA_REPRODUCCION").
  3. Si tipo es INSEMINACION_ARTIFICIAL, MONTA_NATURAL, TRANSFERENCIA_EMBRION (exitoso) o DIAGNOSTICO_GESTACION (POSITIVO)
     -> UPDATE Animal SET isGestante = true.

ALGORITMO DE SALIDA:
  1. Validar estado previo: IF (tipo IN ["PARTO", "ABORTO"] && isGestante === false) -> ABORTAR (HTTP 422: "ANIMAL_NO_GESTANTE").
  2. Si se registra un evento de tipo PARTO, ABORTO, o un DIAGNÓSTICO NEGATIVO de preñez (NOTA: El SECADO no interrumpe la gestación):
     -> UPDATE Animal SET isGestante = false.
```

### RN-009 — Validación de Edad Reproductiva Mínima (NUEVO)
```text
TRIGGER: POST /api/v1/animales/:animalId/reproduccion

VALIDACIÓN (Capa de Servicios):
  Al registrar eventos reproductivos de entrada (MONTA_NATURAL, INSEMINACION_ARTIFICIAL, TRANSFERENCIA_EMBRION):
  1. Calcular la edad de la hembra (Date.now() - fechaNacimiento).
  2. IF (edad < 12 meses):
       ABORTAR la transacción.
       RETORNAR HTTP 422 Unprocessable Entity.
       CÓDIGO: "EDAD_REPRODUCTIVA_INSUFICIENTE"
       MENSAJE: "La hembra debe tener al menos 12 meses de edad para eventos reproductivos."
```

### RN-007 — Transición Automática a Estados Terminales (ACTUALIZACIÓN COMPLETA)
```text
TRIGGER: POST /api/v1/animales/:animalId/movimientos

ALGORITMO (MovimientoService.create):
  Dentro de la misma transacción atómica de creación del movimiento:
  1. IF (tipo === "TRASLADO_INTERNO"):
       UPDATE Animal SET predioId = nuevoPredioId 
       (Mantiene intacto todo el historial de eventos sanitarios y reproductivos para trazabilidad).
  2. IF (tipo === "CAMBIO_PROPIETARIO"):
       UPDATE Animal SET estado = "VENDIDO", etapaActual = "BAJA" 
       INSERT HistorialEtapa { etapaAnterior: etapaActual, etapaNueva: "BAJA", observaciones: "Venta externa" }
  3. IF (tipo === "EGRESO_SACRIFICIO"):
       UPDATE Animal SET estado = "MUERTO", etapaActual = "BAJA"
       INSERT HistorialEtapa { etapaAnterior: etapaActual, etapaNueva: "BAJA", observaciones: "Sacrificio" }
```

### RN-008 — Registro Atómico de Movimiento de Ingreso (ACTUALIZACIÓN COMPLETA)
```text
TRIGGER: POST /api/v1/animales

ALGORITMO (AnimalService.create):
  Al crear un nuevo animal en la base de datos, en la misma transacción:
  1. Si `registrarIngreso === true`: 
     INSERT Movimiento { tipo: "INGRESO", fecha: fechaNacimiento, predioDestinoId: predioId, numeroGuia: numeroGuiaIngreso }
  2. Si `isGestante === true` y `sexo === HEMBRA`:
     INSERT EventoReproductivo { tipo: "DIAGNOSTICO_GESTACION", resultado: "POSITIVO", animalId: nuevoAnimal.id }
     El trigger de la RF-04 se encargará de setear la bandera del animal.
```

### RN-014 — Recuperación del Peso Fronterizo (NUEVO)
```text
TRIGGER: POST /api/v1/animales/:animalId/movimientos

ALGORITMO (MovimientoService.create):
  Dentro de la misma transacción atómica de creación del movimiento:
  1. Si el payload incluye `pesoMovimiento` (un valor > 0):
  2. INSERT Pesaje { animalId: animalId, peso: pesoMovimiento, fecha: fecha, observaciones: "Peso registrado en control de movimiento" }
  Esto garantiza que las básculas de los camiones alimenten la curva de productividad sin llevar la vaca a la manga.
```

### RN-011 — Gestión y Vinculación de Usuarios (NUEVO)
```text
1. Creación de Personal Fijo: El `PROPIETARIO` puede crear cuentas nuevas con rol `OPERARIO` o `CLIENTE`, las cuales quedarán atadas permanentemente al `predioId` especificado.
2. Vinculación de Veterinarios: El `PROPIETARIO` NO crea cuentas de veterinarios. Envía una invitación por email a través del sistema. Si el `VETERINARIO` ya existe (cuenta única global), el sistema añade el predio del Propietario a la lista de `prediosAsignados` del Veterinario.
3. Selector de Entorno: Al hacer Login, si el usuario autenticado es un `VETERINARIO` y tiene múltiples `prediosAsignados`, el sistema debe exigirle que seleccione sobre qué predio va a operar en esa sesión específica para no mezclar datos clínicos de diferentes clientes.
   PROTECCIÓN MULTI-TENANT: El backend DEBE filtrar la lista de predios asignados con `deletedAt IS NULL` para evitar que los veterinarios ingresen a fincas "fantasma".
```

### RN-012 — Cascada de Seguridad en Predios Eliminados (NUEVO)
```text
TRIGGER: DELETE /api/v1/predios/:id (Soft delete)

ALGORITMO (PredioService.delete):
  Al realizar un soft-delete de un Predio, el sistema debe ejecutar en la misma transacción atómica:
  UPDATE Usuario SET activo = false WHERE predioId = predio.id
  Esto evita que operarios o estudiantes de una finca dada de baja puedan seguir autenticándose y operando en un entorno "fantasma".
```

### RN-016 — Control de Transición de Etapas (NUEVO)
```text
TRIGGER: POST /api/v1/animales/:animalId/etapa

ALGORITMO (AnimalService.transicionarEtapa):
  1. Validar Transición: 
     - No permitir saltos ilógicos (ej: REPRODUCTOR -> CRIA).
     - Si etapaAnterior es CRIA, permitir solo a RECRIA o REEMPLAZO.
     - Si etapaNueva es BAJA, DENEGAR (HTTP 422). Las bajas solo se pueden registrar automáticamente a través de los endpoints de Muerte o Venta.
  2. Transacción Atómica:
     a. UPDATE Animal SET etapaActual = nuevaEtapa.
     b. INSERT HistorialEtapa { animalId, etapaAnterior, etapaNueva, observaciones }.
  3. Si la operación falla, ejecutar ROLLBACK para mantener consistencia.
```

### RN-017 — Cálculo de Peso al Destete (Métodos A, B, C)
```text
TRIGGER: POST /api/v1/animales/:animalId/pesajes/destete

LÓGICA DE CÁLCULO:
  1. Si Método C (Zoométrico):
     Peso = (PerímetroToracico * PerímetroToracico * LongitudCorporal) / 10.838[cite: 16].
  2. Almacenar resultado como Peso Real para los cálculos subsecuentes.
```

### RN-018 — Auditoría Forense en Borrado de Eventos (NUEVO)
```text
TRIGGER: DELETE /api/v1/animales/:animalId/eventos/:id (y otros deletes)

ALGORITMO (AuditService):
  Al eliminar un registro (Soft Delete o Hard Delete):
  1. Capturar el objeto completo a eliminar.
  2. INSERT AuditLog { accion: "DELETE_EVENTO", datos: JSON.stringify(objetoOriginal) }.
  Esto previene fraudes donde un administrador borra un evento sanitario activo para evadir cuarentenas, asegurando que la evidencia (como la `fechaFinRetiro`) quede sellada.
```

---

## 10. Plan de Implementación por Fases

### Fase 0 — Fundación (1-2 días)
- [ ] Inicializar estructura monorepo `backend/` + `frontend/`
- [ ] TypeScript strict, ESLint, Prettier, Husky, lint-staged
- [ ] Prisma schema completo + migración inicial SQLite
- [ ] Express: Helmet, CORS, rate limiting, middlewares base
- [ ] Vite + React + Tailwind (paleta oficial `#2e9f5b` / `#4a3728`)

### Fase 1 — Módulo de Registro (3-4 días)
- [ ] Modelos: `Propietario`, `Predio`, `Usuario`, `Animal`, `AuditLog`
- [ ] Auth: login, logout, refresh token, me
- [ ] CRUD Propietarios, Predios, Usuarios (RBAC)
- [ ] CRUD Animales (codigoVisual 10d, soft delete, RN-001)
- [ ] Frontend: Layout principal, Login, Dashboard, listado/registro de animales
- [ ] Tests: AnimalService, AuthService, validators

### Fase 2 — Historial Clínico (2-3 días)
- [ ] Modelo `EventoSanitario` + migración
- [ ] Backend: CRUD eventos + lógica RN-002 (retiro, bloqueo)
- [ ] Cron job de liberación automática de retiro
- [ ] Frontend: formulario eventos, historial timeline, alerta roja (#dc2626)
- [ ] Tests: EventoSanitarioService (cálculo retiro, bloqueo movimientos)

### Fase 3 — Productividad, Reproducción y Movimientos (3-4 días)
- [ ] Modelos `Pesaje`, `EventoReproductivo`, `Movimiento` + migración
- [ ] Backend: pesajes (RN-004), parto (RN-003), movimientos con bloqueos
- [ ] Frontend: formularios pesaje, reproducción/parto, línea de tiempo
- [ ] Tests: PesajeService, ReproduccionService

### Fase 4 — Consulta e Informes (2-3 días)
- [ ] Backend: Hoja de Vida integral + reportes + exportación CSV/PDF
- [ ] Frontend: Hoja de Vida con timeline interactivo
- [ ] Frontend: buscador rápido por código visual (campo de 10 dígitos)
- [ ] Frontend: páginas de reportes con filtros y descarga

### Fase 5 — QA y Pulido (2 días)
- [ ] Cobertura tests ≥ 80% en servicios críticos
- [ ] Accesibilidad WCAG AA (touch targets 44px, contraste 4.5:1)
- [ ] Optimización queries Prisma (índices, select proyectados)
- [x] JSDoc completo en todos los servicios
- [x] Pruebas E2E en flujos críticos (Playwright integrado)

---

## 11. Requisitos No Funcionales

### RNF-04 — Tolerancia a Conectividad Limitada (Offline-First) - [ACTUALIZACIÓN COMPLETA]
El frontend (React/Vite) debe estar configurado como PWA. Debe utilizar IndexedDB para almacenar localmente los envíos de los formularios críticos (pesajes, eventos sanitarios, reproducción, creación de animales) cuando no haya conexión.
**Resolución de Dependencias Offline:** El endpoint o servicio de sincronización backend debe procesar la cola ordenadamente manteniendo un mapa de resolución de IDs. Si un Animal es creado offline con un UUID temporal (ej. "uuid-123") y recibe un ID real al insertarse (ej. `id: 85`), todos los eventos subsecuentes en la cola que referencien `animalId: "uuid-123"` deben mutarse dinámicamente al ID real (`85`) antes de su inserción.
**Validación Local Crítica (Retiro Sanitario):** Para prevenir desincronizaciones irreversibles entre el mundo físico y el sistema (ej. cargar un animal medicado a un camión estando offline y que el backend rechace la venta horas después), el frontend PWA debe descargar y cachear obligatoriamente la bandera `isEnRetiro` (o `fechaFinRetiro`) de todo el rebaño activo al sincronizar. Las validaciones críticas de movimientos (como RN-002) DEBEN ejecutarse localmente contra esta caché en IndexedDB antes de permitir al usuario encolar el registro.

### RNF-05 — Resiliencia de Base de Datos
El backend debe incluir un cron job diario que ejecute un volcado de respaldo de la base de datos SQLite (`dev.db`), comprimiéndolo y almacenándolo en un directorio seguro para prevenir la pérdida total de información ante fallos de hardware en el servidor local.

---

## Apéndice A — Variables de Entorno

```env
# backend/.env.example
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_SECRET=your_refresh_token_secret_minimum_32_chars
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug

# frontend/.env.example
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_APP_NAME="Sistema de Trazabilidad Bovina"
VITE_APP_VERSION=1.0.0
```

---

## Apéndice B — Códigos de Error del Dominio

| Código                        | HTTP | Descripción                                             |
|-------------------------------|------|---------------------------------------------------------|
| `ANIMAL_NOT_FOUND`            | 404  | Animal no encontrado por ID o código visual             |
| `ANIMAL_ESTADO_TERMINAL`      | 422  | Intento de registrar operación en animal inactivo       |
| `CODIGO_VISUAL_DUPLICADO`     | 409  | El código visual ya está registrado                     |
| `CODIGO_VISUAL_IMMUTABLE`     | 422  | Intento de modificar el código visual                   |
| `CODIGO_VISUAL_INVALIDO`      | 400  | No son exactamente 10 dígitos numéricos                 |
| `ANIMAL_EN_RETIRO_BLOQUEADO`  | 422  | Animal en retiro no puede ser trasladado/egresado       |
| `USUARIO_INACTIVO`            | 403  | La cuenta del usuario está desactivada                  |
| `CREDENCIALES_INVALIDAS`      | 401  | Email o contraseña incorrectos                          |
| `TOKEN_EXPIRADO`              | 401  | JWT access token expirado                               |
| `REFRESH_TOKEN_INVALIDO`      | 401  | Refresh token inválido o expirado                       |
| `PERMISOS_INSUFICIENTES`      | 403  | Rol sin permisos para esta operación                    |
| `PREDIO_CON_ANIMALES_ACTIVOS` | 422  | No se puede eliminar un predio con animales activos     |
| `PARTO_MADRE_INVALIDA`        | 422  | El animal seleccionado como madre no es HEMBRA          |
| `GUIA_REQUERIDA`              | 400  | Guía oficial obligatoria para este tipo de movimiento   |
| `ANIMAL_YA_GESTANTE`          | 422  | Intento de registrar IA/Monta en vaca ya gestante       |
| `EDAD_REPRODUCTIVA_INSUFICIENTE`| 422  | Hembra menor a 12 meses en evento reproductivo          |

---

## 12. Blindaje de Frontend y RBAC UI

### 12.1 Arquitectura de Seguridad en UI

```text
REGLAS DE PROTECCIÓN:
  1. Hook `useCanAccess(roles: Rol[])`: 
     - Hook centralizado que valida el rol del usuario desde el AuthStore.
     - Retorna booleano para renderizado condicional.
  2. Componente `RoleGuard`: 
     - Componente envolvente que bloquea el renderizado de rutas (ej: /eventos-lote) y redirige a '/dashboard' si el rol no tiene permisos.
  3. Estado "Solo Lectura": 
     - Si el rol es CLIENTE, se restringe globalmente el acceso a acciones mutativas a través de la interfaz.
```

---

*Especificación técnica generada el 18 de junio de 2026.*
*Versión 1.0.0 — Alineada con CONSTITUTION.md (Dark Glassmorphism UI y RBAC Integrado)*

---

## 13. Gestión de Contexto Global (Filtros en Topbar)

Esta sección define el comportamiento de los filtros de "Propietario" y "Predio" presentes en la barra de navegación superior, los cuales actúan como un Contexto Global de aplicación.

### 13.1 Lógica de Jerarquía y Cascada
- **Jerarquía Estricta:** El filtro de *Predio* depende directamente del filtro de *Propietario*.
- Si se selecciona un Propietario (o "Todos" en caso del SUPER_ADMIN), el dropdown de Predios debe realizar un fetch dinámico para mostrar exclusivamente las fincas que pertenezcan a dicho Propietario.
- Los predios "huérfanos" (sin propietario asociado) nunca deben aparecer en la lista.

### 13.2 Contrato de Estado Persistente (Zustand Store)
- Se implementará un `useGlobalContext` (o se extenderá el actual `authStore`) para almacenar de forma persistente el `selectedPropietarioId` y `selectedPredioId`.
- **Re-fetch Reactivo:** Cualquier cambio en el contexto global del Navbar dispara automáticamente la invalidación y refetch de React Query, actualizando al instante los datos en el Dashboard, Listas de Animales y Reportes, sin recargar la página.
- **UI:** Integrado en el Topbar siguiendo estrictamente el diseño "Dark Glassmorphism".

### 13.3 Lógica Condicional de Renderizado según Rol
| Rol | Lógica de Renderizado en el Topbar |
| --- | --- |
| **SUPER_ADMIN** | Ve ambos dropdowns (Propietario y Predio) con opción "Todos" y jerarquía en cascada. |
| **PROPIETARIO** | Solo ve el dropdown de "Predio" con sus fincas. |
| **VETERINARIO / OPERARIO** | - **Si tiene >1 predio asignado:** Ve el dropdown seleccionable de "Predio" con sus fincas autorizadas.<br>- **Si tiene 1 solo predio asignado:** El filtro se renderiza como un *Badge/Label* de solo lectura indicando su ubicación actual. No puede seleccionar ni navegar a otras fincas. |

---

## 14. Protocolo de Desarrollo Interactivo (Sincronización Frontend-Backend)

### 14.1 Reglas del Arquitecto IA
- **ESTADO:** El sistema está en modo "Arquitectura". La generación de código está **SUSPENDIDA** hasta nuevo aviso.
- **FLUJO OBLIGATORIO:**
    1. **ANALIZAR:** Antes de proponer nada, mapear dependencias contra `SPEC.md` y `CONSTITUTION.md`.
    2. **INTERROGAR:** Lanzar un máximo de 3 preguntas de alta fidelidad al Arquitecto Humano.
    3. **ESPECIFICAR:** Actualizar el `SPEC.md` con los acuerdos alcanzados.
    4. **GENERAR:** Solo proceder a escribir código (React/TS/Prisma) cuando el Humano valide la especificación actualizada.
- **REGLA DE ORO:** Nunca asumir requisitos. Si no está en el `SPEC.md`, debe ser validado antes de ser implementado.
