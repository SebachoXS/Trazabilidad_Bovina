/**
 * @file backend/tests/validators/health.validator.test.ts
 * @description Tests unitarios del schema eventoSanitarioCreateSchema.
 * CONSTITUTION §8.1: Cobertura mínima 80%. Pruebas para casos válidos e inválidos.
 */

import {
  eventoSanitarioCreateSchema,
  eventoSanitarioUpdateSchema,
  eventoSanitarioQuerySchema,
} from '../../src/validators/health.validator';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const fechaValida = '2026-06-18T08:00:00Z';

const payloadBase = {
  tipo: 'TRATAMIENTO',
  fecha: fechaValida,
  producto: 'Oxitetraciclina LA',
  periodoRetiro: 28,
};

// ─────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────

describe('eventoSanitarioCreateSchema', () => {
  describe('Casos válidos', () => {
    it('debe aceptar un TRATAMIENTO válido con periodoRetiro', () => {
      const result = eventoSanitarioCreateSchema.safeParse(payloadBase);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tipo).toBe('TRATAMIENTO');
        expect(result.data.periodoRetiro).toBe(28);
        expect(result.data.fecha).toBeInstanceOf(Date);
      }
    });

    it('debe aceptar una VACUNACION con producto y sin periodoRetiro', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'VACUNACION',
        fecha: fechaValida,
        producto: 'Brucelosis RB51',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.periodoRetiro).toBe(0); // default
      }
    });

    it('debe aceptar un DIAGNOSTICO sin producto (no lo requiere)', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'DIAGNOSTICO',
        fecha: fechaValida,
        diagnostico: 'Neumonía leve',
        observaciones: 'Animal con temperatura 39.8°C',
      });
      expect(result.success).toBe(true);
    });

    it('debe aceptar una CIRUGIA sin producto', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'CIRUGIA',
        fecha: fechaValida,
        observaciones: 'Castración rutinaria',
      });
      expect(result.success).toBe(true);
    });

    it('debe coercionar fecha desde string ISO a Date', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'DIAGNOSTICO',
        fecha: '2026-01-15',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fecha).toBeInstanceOf(Date);
      }
    });

    it('debe aplicar default 0 a periodoRetiro cuando no se envía', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'DIAGNOSTICO',
        fecha: fechaValida,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.periodoRetiro).toBe(0);
      }
    });
  });

  describe('Errores de validación', () => {
    it('debe rechazar un tipo de evento inválido', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'DESINFECCION', // no existe
        fecha: fechaValida,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['tipo']).toBeDefined();
      }
    });

    it('debe rechazar cuando falta la fecha', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'DIAGNOSTICO',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['fecha']).toBeDefined();
      }
    });

    it('debe rechazar periodoRetiro negativo', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'TRATAMIENTO',
        fecha: fechaValida,
        producto: 'Ivermectina',
        periodoRetiro: -5,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['periodoRetiro']).toBeDefined();
      }
    });

    it('debe rechazar observaciones con más de 1000 caracteres', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'DIAGNOSTICO',
        fecha: fechaValida,
        observaciones: 'A'.repeat(1001),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['observaciones']).toBeDefined();
      }
    });

    it('superRefine: debe rechazar VACUNACION sin producto', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'VACUNACION',
        fecha: fechaValida,
        // producto ausente
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten();
        expect(errors.fieldErrors['producto']).toBeDefined();
        expect(errors.fieldErrors['producto']?.[0]).toMatch(/obligatorio/i);
      }
    });

    it('superRefine: debe rechazar TRATAMIENTO sin producto', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'TRATAMIENTO',
        fecha: fechaValida,
        periodoRetiro: 14,
        // producto ausente
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['producto']).toBeDefined();
      }
    });

    it('superRefine: debe rechazar DESPARASITACION sin producto', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'DESPARASITACION',
        fecha: fechaValida,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors['producto']).toBeDefined();
      }
    });

    it('debe rechazar periodoRetiro no entero (decimal)', () => {
      const result = eventoSanitarioCreateSchema.safeParse({
        tipo: 'TRATAMIENTO',
        fecha: fechaValida,
        producto: 'Ivermectina',
        periodoRetiro: 14.5,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('eventoSanitarioUpdateSchema', () => {
  it('debe aceptar body vacío (todos los campos opcionales)', () => {
    const result = eventoSanitarioUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('debe aceptar actualización parcial solo con observaciones', () => {
    const result = eventoSanitarioUpdateSchema.safeParse({
      observaciones: 'Actualización de notas clínicas.',
    });
    expect(result.success).toBe(true);
  });
});

describe('eventoSanitarioQuerySchema', () => {
  it('debe aplicar defaults page=1 y limit=20', () => {
    const result = eventoSanitarioQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('debe coercionar strings numéricos de query a números', () => {
    const result = eventoSanitarioQuerySchema.safeParse({ page: '2', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('debe transformar conRetiroActivo "true" a boolean true', () => {
    const result = eventoSanitarioQuerySchema.safeParse({ conRetiroActivo: 'true' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conRetiroActivo).toBe(true);
    }
  });

  it('debe rechazar limit > 100', () => {
    const result = eventoSanitarioQuerySchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });
});
