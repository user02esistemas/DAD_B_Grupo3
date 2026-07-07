import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface BoletoData {
  pasajero: {
    nombres: string;
    apellidos: string;
    dni: string;
  };
  viaje: {
    origen: string;
    destino: string;
    fecha_salida: string;
    hora_salida: string;
    tipoBus: string;
    placa: string;
  };
  asiento: {
    numero: number | string;
    piso: number | string;
  };
  pago: {
    precio: number | string;
  };
  ticket: {
    codigo_qr: string;
  };
}

export async function generateBoletoPDF(data: BoletoData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // Configuración base
  const startX = 10;
  const startY = 20;
  const width = 190;
  const height = 75;
  const separatorX = startX + 135;

  // Colores
  const orange = [240, 118, 57] as [number, number, number];
  const darkGray = [40, 40, 40] as [number, number, number];
  const lightGray = [250, 250, 250] as [number, number, number];
  
  // Fondo general del boleto
  doc.setFillColor(...lightGray);
  doc.roundedRect(startX, startY, width, height, 4, 4, "F");
  
  // Borde naranja principal
  doc.setDrawColor(...orange);
  doc.setLineWidth(0.6);
  doc.roundedRect(startX, startY, width, height, 4, 4, "D");

  // Franja superior naranja
  doc.setFillColor(...orange);
  doc.rect(startX, startY, width, 16, "F");

  // ================= ENCABEZADO =================
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("BOLETO DE VIAJE", startX + 5, startY + 11);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("EL CUMBE", startX + width - 25, startY + 11);

  // Línea de corte punteada
  doc.setDrawColor(...orange);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(separatorX, startY + 16, separatorX, startY + height);
  doc.setLineDashPattern([], 0);

  // ================= SECCIÓN IZQUIERDA (Datos) =================
  doc.setTextColor(...darkGray);
  
  // Pasajero
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("PASAJERO / PASSENGER", startX + 5, startY + 24);
  
  doc.setTextColor(...darkGray);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${data.pasajero.nombres} ${data.pasajero.apellidos}`.toUpperCase(), startX + 5, startY + 29);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`DNI: ${data.pasajero.dni}`, startX + 5, startY + 34);

  // Ruta
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("ORIGEN / FROM", startX + 5, startY + 44);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.viaje.origen.toUpperCase(), startX + 5, startY + 49);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("DESTINO / TO", startX + 60, startY + 44);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.viaje.destino.toUpperCase(), startX + 60, startY + 49);

  // Fecha, Hora y Bus
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("FECHA / DATE", startX + 5, startY + 61);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.viaje.fecha_salida, startX + 5, startY + 66);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("HORA / TIME", startX + 40, startY + 61);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.viaje.hora_salida, startX + 40, startY + 66);
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("SERVICIO", startX + 75, startY + 61);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Bus ${data.viaje.tipoBus.toUpperCase()} (${data.viaje.placa})`, startX + 75, startY + 66);


  // ================= SECCIÓN DERECHA (Talón QR) =================
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("BOARDING PASS", separatorX + 5, startY + 11);

  // Asiento
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120, 120, 120);
  doc.text("ASIENTO / SEAT", separatorX + 5, startY + 24);
  
  doc.setFontSize(24);
  doc.setTextColor(...orange);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.asiento.numero), separatorX + 5, startY + 33);
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Piso ${data.asiento.piso}`, separatorX + 25, startY + 30);

  // Precio
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`S/ ${data.pago.precio}`, separatorX + 35, startY + 23);

  // QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(data.ticket.codigo_qr, { width: 120, margin: 0 });
    // Ajustado para que el QR quepa bien en el talón derecho
    doc.addImage(qrDataUrl, "PNG", separatorX + 10, startY + 38, 32, 32);
  } catch (err) {
    console.error("Error generando QR", err);
    doc.setFontSize(8);
    doc.text(data.ticket.codigo_qr, separatorX + 5, startY + 50);
  }

  // ================= TÉRMINOS Y CONDICIONES =================
  const termsY = startY + height + 15;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("INFORMACIÓN IMPORTANTE PARA SU VIAJE:", startX, termsY);
  
  doc.setFont("helvetica", "normal");
  doc.text("- Presentarse 30 minutos antes del horario de embarque portando su DNI en formato físico.", startX, termsY + 6);
  doc.text("- Este boleto es personal e intransferible. Todo cambio o postergación está sujeto a disponibilidad y condiciones.", startX, termsY + 12);
  doc.text("- El transporte de equipaje está sujeto al peso máximo permitido por la empresa (Consultar en agencia).", startX, termsY + 18);
  doc.text("- No es necesario imprimir este boleto, puede mostrar el código QR directamente desde su dispositivo móvil.", startX, termsY + 24);
  doc.text("- Conserve su boleto durante todo el trayecto hasta el destino final.", startX, termsY + 30);

  // Save the PDF
  doc.save(`Boleto_ElCumbe_${data.pasajero.dni}.pdf`);
}
