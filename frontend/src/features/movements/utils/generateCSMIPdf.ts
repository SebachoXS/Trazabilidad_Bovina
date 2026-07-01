import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export const generateCSMIPdf = (guia: any, isFromWizard = false) => {
  try {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificado Zoosanitario de Producción y Movilización (CSMI)', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('República de Control Agropecuario - Sistema Oficial de Trazabilidad Bovina', 105, 28, { align: 'center' });

    // Datos principales
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° Guía: ${guia?.numeroGuia || 'N/A'}`, 14, 40);
    doc.text(`Fecha de Emisión: ${new Date(guia?.fecha || new Date()).toLocaleDateString()}`, 130, 40);

    // Detalles de Transporte
    doc.setFontSize(10);
    doc.text('Datos del Transporte:', 14, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Conductor: ${guia?.transportista || 'N/A'}`, 14, 62);
    doc.text(`Cédula: ${guia?.cedulaChofer || 'N/A'}`, 130, 62);
    doc.text(`Vehículo / Placa: ${guia?.placa || guia?.placaVehiculo || 'N/A'}`, 14, 69);
    doc.text(`Tipo de Movimiento: ${guia?.tipo || 'N/A'}`, 130, 69);

    if (guia?.observaciones) {
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones:', 14, 79);
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(guia.observaciones, 180);
      doc.text(textLines, 14, 85);
    }

    // Lista de animales
    const animales = guia?.animales || [];
    const tableData = animales.map((a: any, index: number) => [
      index + 1,
      a?.codigoVisual || a?.animal?.codigoVisual || `ID: ${a?.id || 'N/A'}`,
      a?.raza || a?.animal?.raza || 'N/A',
      a?.sexo || a?.animal?.sexo || 'N/A',
      'APTO'
    ]);

    const startY = guia?.observaciones ? 95 + (doc.splitTextToSize(guia.observaciones, 180).length * 5) : 85;

    autoTable(doc, {
      startY: startY,
      head: [['N°', 'Código Oficial (Arete)', 'Raza', 'Sexo', 'Estado Sanitario']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [4, 120, 87] }, // emerald-700
    });

    // Firmas
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    
    if (finalY < 270) {
      doc.line(20, finalY, 70, finalY);
      doc.text('Firma Remitente (Origen)', 45, finalY + 5, { align: 'center' });

      doc.line(80, finalY, 130, finalY);
      doc.text('Firma del Transportista', 105, finalY + 5, { align: 'center' });

      doc.line(140, finalY, 190, finalY);
      doc.text('Firma Receptor (Destino)', 165, finalY + 5, { align: 'center' });
    }

    const filename = `Guia_${guia.numeroGuia || Date.now()}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error(error);
    toast.error("Error al generar el PDF. Revisa la consola.");
  }
};
