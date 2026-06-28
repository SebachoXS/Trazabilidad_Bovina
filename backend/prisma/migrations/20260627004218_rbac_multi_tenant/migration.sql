-- CreateTable
CREATE TABLE "propietarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "predios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "area" REAL,
    "propietarioId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "predios_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "propietarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "secuencias_predios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "predioId" INTEGER NOT NULL,
    "anio" TEXT NOT NULL,
    "secuencial" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "secuencias_predios_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "predios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "propietarioId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "usuarios_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "propietarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sesiones_usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "dispositivo" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "sesiones_usuarios_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "animales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigoVisual" TEXT NOT NULL,
    "cusa" TEXT NOT NULL,
    "nombre" TEXT,
    "raza" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "fechaNacimiento" DATETIME,
    "pesoNacimiento" REAL,
    "esToroCatalogo" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "etapaActual" TEXT NOT NULL DEFAULT 'CRIA',
    "isGestante" BOOLEAN NOT NULL DEFAULT false,
    "predioId" INTEGER NOT NULL,
    "madreId" INTEGER,
    "padreId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "animales_predioId_fkey" FOREIGN KEY ("predioId") REFERENCES "predios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "animales_madreId_fkey" FOREIGN KEY ("madreId") REFERENCES "animales" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "animales_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "animales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "historial_etapas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "animalId" INTEGER NOT NULL,
    "etapaAnterior" TEXT NOT NULL,
    "etapaNueva" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    CONSTRAINT "historial_etapas_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "eventos_sanitarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "animalId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "producto" TEXT,
    "principioActivo" TEXT,
    "dosis" TEXT,
    "viaAdministracion" TEXT,
    "lote" TEXT,
    "laboratorio" TEXT,
    "periodoRetiro" INTEGER NOT NULL DEFAULT 0,
    "fechaFinRetiro" DATETIME,
    "diagnostico" TEXT,
    "observaciones" TEXT,
    "creadoPorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "eventos_sanitarios_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "eventos_sanitarios_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pesajes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "animalId" INTEGER NOT NULL,
    "tipoPesaje" TEXT,
    "fecha" DATETIME NOT NULL,
    "peso" REAL NOT NULL,
    "perimetroToracico" REAL,
    "longitudCorporal" REAL,
    "condicionCorporal" REAL,
    "operarioId" INTEGER NOT NULL,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pesajes_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pesajes_operarioId_fkey" FOREIGN KEY ("operarioId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "eventos_reproductivos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "animalId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "madreId" INTEGER,
    "padreId" INTEGER,
    "terneroId" INTEGER,
    "diasGestacion" INTEGER,
    "resultado" TEXT,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "eventos_reproductivos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "eventos_reproductivos_madreId_fkey" FOREIGN KEY ("madreId") REFERENCES "animales" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "eventos_reproductivos_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "animales" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "animalId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "predioOrigenId" INTEGER,
    "predioDestinoId" INTEGER,
    "numeroGuia" TEXT,
    "motivoEgreso" TEXT,
    "pesoMovimiento" REAL,
    "creadoPorId" INTEGER NOT NULL,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimientos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "movimientos_predioOrigenId_fkey" FOREIGN KEY ("predioOrigenId") REFERENCES "predios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "movimientos_predioDestinoId_fkey" FOREIGN KEY ("predioDestinoId") REFERENCES "predios" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "movimientos_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" INTEGER,
    "datos" TEXT,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_UsuariosPredios" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_UsuariosPredios_A_fkey" FOREIGN KEY ("A") REFERENCES "predios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_UsuariosPredios_B_fkey" FOREIGN KEY ("B") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "propietarios_documento_key" ON "propietarios"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "propietarios_email_key" ON "propietarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "predios_codigo_key" ON "predios"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "secuencias_predios_predioId_anio_key" ON "secuencias_predios"("predioId", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_usuarios_refreshToken_key" ON "sesiones_usuarios"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "animales_cusa_key" ON "animales"("cusa");

-- CreateIndex
CREATE INDEX "animales_predioId_idx" ON "animales"("predioId");

-- CreateIndex
CREATE INDEX "animales_estado_sexo_idx" ON "animales"("estado", "sexo");

-- CreateIndex
CREATE UNIQUE INDEX "animales_codigoVisual_predioId_deletedAt_key" ON "animales"("codigoVisual", "predioId", "deletedAt");

-- CreateIndex
CREATE INDEX "eventos_sanitarios_animalId_idx" ON "eventos_sanitarios"("animalId");

-- CreateIndex
CREATE INDEX "eventos_sanitarios_fechaFinRetiro_idx" ON "eventos_sanitarios"("fechaFinRetiro");

-- CreateIndex
CREATE INDEX "pesajes_animalId_fecha_idx" ON "pesajes"("animalId", "fecha");

-- CreateIndex
CREATE INDEX "eventos_reproductivos_animalId_idx" ON "eventos_reproductivos"("animalId");

-- CreateIndex
CREATE INDEX "eventos_reproductivos_madreId_idx" ON "eventos_reproductivos"("madreId");

-- CreateIndex
CREATE INDEX "eventos_reproductivos_padreId_idx" ON "eventos_reproductivos"("padreId");

-- CreateIndex
CREATE INDEX "movimientos_animalId_idx" ON "movimientos"("animalId");

-- CreateIndex
CREATE INDEX "movimientos_predioOrigenId_idx" ON "movimientos"("predioOrigenId");

-- CreateIndex
CREATE INDEX "movimientos_predioDestinoId_idx" ON "movimientos"("predioDestinoId");

-- CreateIndex
CREATE UNIQUE INDEX "_UsuariosPredios_AB_unique" ON "_UsuariosPredios"("A", "B");

-- CreateIndex
CREATE INDEX "_UsuariosPredios_B_index" ON "_UsuariosPredios"("B");
