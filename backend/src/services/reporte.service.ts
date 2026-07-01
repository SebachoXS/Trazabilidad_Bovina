/**
 * @file backend/src/services/reporte.service.ts
 * @description Servicio de analítica y reportes (Fase 4).
 */

import prisma from '../config/database';
import type { ReporteQueryDto } from '../validators/reporte.validator';
import { AsyncParser } from '@json2csv/node';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export class ReporteService {
  /**
   * Genera el reporte de Inventario.
   */
  async getInventario(query: ReporteQueryDto) {
    const where: any = { deletedAt: null, estado: { not: 'PENDIENTE_APROBACION' } };
    if (query.predioId) where.predioId = query.predioId;
    if (query.propietarioId) where.predio = { ...where.predio, propietarioId: query.propietarioId };

    const animales = await prisma.animal.findMany({
      where,
      include: { predio: { select: { nombre: true } } },
    });

    const inventario = animales.map(a => ({
      ID: a.id,
      CodigoVisual: a.codigoVisual,
      Nombre: a.nombre || 'N/A',
      Raza: a.raza,
      Sexo: a.sexo,
      Estado: a.estado,
      FechaNacimiento: a.fechaNacimiento?.toISOString().split('T')[0] || 'N/A',
      Predio: a.predio.nombre,
    }));

    if (query.formato === 'csv') return this.generateCsv(inventario);
    if (query.formato === 'pdf') return this.generatePdf('Inventario General', inventario);

    // Formato JSON (incluye resumen)
    const resumen = {
      total: animales.length,
      porSexo: {
        HEMBRA: animales.filter(a => a.sexo === 'HEMBRA').length,
        MACHO: animales.filter(a => a.sexo === 'MACHO').length,
      },
      porEstado: animales.reduce((acc, a) => {
        acc[a.estado] = (acc[a.estado] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return { resumen, detalle: inventario };
  }

  /**
   * Genera el reporte Sanitario.
   */
  async getSanitario(query: ReporteQueryDto) {
    const where: any = {};
    if (query.predioId) where.animal = { ...where.animal, predioId: query.predioId };
    if (query.propietarioId) where.animal = { ...where.animal, predio: { propietarioId: query.propietarioId } };
    if (query.fechaDesde || query.fechaHasta) {
      where.fecha = {};
      if (query.fechaDesde) where.fecha.gte = query.fechaDesde;
      if (query.fechaHasta) where.fecha.lte = query.fechaHasta;
    }

    const eventos = await prisma.eventoSanitario.findMany({
      where,
      include: { animal: { select: { codigoVisual: true } } },
      orderBy: { fecha: 'desc' },
    });

    const sanitarios = eventos.map(e => ({
      Animal: e.animal.codigoVisual,
      Fecha: e.fecha.toISOString().split('T')[0],
      Tipo: e.tipo,
      Diagnostico: e.diagnostico || 'N/A',
      Producto: e.producto || 'N/A',
      Laboratorio: e.laboratorio || 'N/A',
      DiasRetiro: e.periodoRetiro || 0,
    }));

    if (query.formato === 'csv') return this.generateCsv(sanitarios);
    if (query.formato === 'pdf') return this.generatePdf('Reporte Sanitario', sanitarios);

    const resumen = {
      totalEventos: eventos.length,
      vacunaciones: eventos.filter(e => e.tipo === 'VACUNACION').length,
      tratamientos: eventos.filter(e => e.tipo === 'TRATAMIENTO').length,
      diagnosticos: eventos.filter(e => e.tipo === 'DIAGNOSTICO').length,
    };

    return { resumen, detalle: sanitarios };
  }

  /**
   * Retorna los animales actualmente bloqueados por período de retiro.
   */
  async getAnimalesEnRetiro(query: ReporteQueryDto) {
    const where: any = { estado: 'EN_RETIRO', deletedAt: null };
    if (query.predioId) where.predioId = query.predioId;
    if (query.propietarioId) where.predio = { ...where.predio, propietarioId: query.propietarioId };

    const animales = await prisma.animal.findMany({
      where,
      include: {
        predio: { select: { nombre: true } },
        eventosSanitarios: {
          where: { fechaFinRetiro: { gt: new Date() } },
          orderBy: { fechaFinRetiro: 'desc' },
        },
      },
    });

    const retiro = animales.map(a => {
      const eventoActivo = a.eventosSanitarios[0];
      
      let diasRestantes = 0;
      if (eventoActivo?.fechaFinRetiro) {
        const diff = eventoActivo.fechaFinRetiro.getTime() - new Date().getTime();
        diasRestantes = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      return {
        // DTO Frontend (JSON)
        id: a.id,
        codigoVisual: a.codigoVisual,
        nombre: a.nombre || 'Sin nombre',
        estado: a.estado,
        eventoId: eventoActivo?.id,
        tipoEvento: eventoActivo?.tipo,
        fecha: eventoActivo?.fecha,
        diagnostico: eventoActivo?.diagnostico,
        producto: eventoActivo?.producto || null,
        diasRetiro: eventoActivo?.periodoRetiro,
        fechaFinRetiro: eventoActivo?.fechaFinRetiro,
        diasRestantes,

        // Campos CSV legacy
        CodigoVisual: a.codigoVisual,
        Predio: a.predio.nombre,
        Producto: eventoActivo?.producto || 'Desconocido',
        FechaTratamiento: eventoActivo?.fecha.toISOString().split('T')[0] || 'N/A',
        FechaLiberacion: eventoActivo?.fechaFinRetiro?.toISOString().split('T')[0] || 'N/A',
      };
    });

    if (query.formato === 'csv') return this.generateCsv(retiro);
    if (query.formato === 'pdf') return this.generatePdf('Animales en Retiro Sanitario', retiro);

    return { total: retiro.length, detalle: retiro };
  }

  // --- MÉTODOS DE EXPORTACIÓN ---

  private async generateCsv(data: any[]): Promise<string> {
    if (data.length === 0) return 'Sin datos';
    const parser = new AsyncParser();
    const csv = await parser.parse(data).promise();
    return csv;
  }

  private generatePdf(titulo: string, data: any[]): PassThrough {
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const stream = new PassThrough();
    doc.pipe(stream);

    doc.fontSize(18).text(titulo, { align: 'center' }).moveDown();
    doc.fontSize(10).text(`Fecha de generación: ${new Date().toLocaleString()}`).moveDown(2);

    if (data.length === 0) {
      doc.text('No hay datos disponibles para los filtros seleccionados.');
    } else {
      const keys = Object.keys(data[0]);
      
      data.forEach((row) => {
        const textRow = keys.map(k => `${k}: ${row[k]}`).join(' | ');
        doc.fontSize(9).text(textRow);
        doc.moveDown(0.5);
      });
    }

    doc.end();
    return stream;
  }
}

export const reporteService = new ReporteService();
