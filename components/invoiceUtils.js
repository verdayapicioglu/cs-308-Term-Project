import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

// Ortak PDF oluşturucu (Dosyayı kaydetmez, nesneyi hazırlar)
function createInvoiceDoc(order) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Background
  doc.setFillColor(235, 230, 250);
  doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 15, 180, 267, 4, 4, "F");

  // Logo & Header
  doc.setFillColor(120, 90, 190);
  doc.circle(28, 26, 2, "F");
  doc.circle(32, 24, 2, "F");
  doc.circle(36, 26, 2, "F");
  doc.circle(32, 30, 3, "F");

  doc.setTextColor(50, 40, 80);
  doc.setFontSize(18);
  doc.text("PatiHouse", 45, 31);

  doc.setFontSize(14);
  doc.text("INVOICE", 190, 31, { align: "right" });

  // Info
  doc.setTextColor(40, 40, 50);
  doc.setFontSize(10);
  const billedTopY = 46;
  doc.text("BILLED TO:", 25, billedTopY);
  doc.setFontSize(11);
  doc.text(order.customerName || "-", 25, billedTopY + 6);

  doc.setFontSize(10);
  const addressLines = [
    order.address?.line1,
    order.address?.line2,
    `${order.address?.zip || ""} ${order.address?.city || ""}`.trim(),
    order.address?.country,
  ].filter(Boolean);

  let addrY = billedTopY + 12;
  addressLines.forEach((line) => {
    doc.text(line, 25, addrY);
    addrY += 5;
  });

  const metaX = 190;
  const metaY = 46;
  doc.text(`Invoice No: ${order.id}`, metaX, metaY, { align: "right" });
  doc.text(`Date: ${order.date}`, metaX, metaY + 6, { align: "right" });
  doc.text(`Payment: ${order.paymentMethod}`, metaX, metaY + 12, { align: "right" });

  // Table
  const tableStartY = 80;
  const items = order.items || [];
  const bodyRows = items.map((item) => [
    item.name,
    String(item.quantity ?? 1),
    `${(item.price ?? 0).toFixed(2)} TRY`,
    `${((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)} TRY`,
  ]);

  autoTable(doc, {
    head: [["Item", "Quantity", "Unit Price", "Total"]],
    body: bodyRows,
    startY: tableStartY,
    margin: { left: 25, right: 25 },
    styles: { fontSize: 9, textColor: [30, 30, 40], cellPadding: 2 },
    headStyles: { fillColor: [120, 90, 190], textColor: [255, 255, 255], halign: "left" },
    columnStyles: {
      0: { halign: "left" },
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "right", cellWidth: 30 },
    },
  });

  const afterTableY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || tableStartY + 10;
  const totalsLabelX = 150;
  const totalsValueX = 180;
  let totalsY = afterTableY + 8;

  doc.setFontSize(9);
  doc.text("Subtotal (excl. VAT):", totalsLabelX, totalsY, { align: "right" });
  doc.text(`${(order.subtotal ?? 0).toFixed(2)} TRY`, totalsValueX, totalsY, { align: "right" });

  totalsY += 6;
  doc.text("Tax (18%):", totalsLabelX, totalsY, { align: "right" });
  doc.text(`${(order.tax ?? 0).toFixed(2)} TRY`, totalsValueX, totalsY, { align: "right" });

  totalsY += 8;
  doc.setFontSize(11);
  doc.setTextColor(80, 55, 140);
  doc.text("Total (incl. VAT):", totalsLabelX, totalsY, { align: "right" });
  doc.text(`${(order.total ?? 0).toFixed(2)} TRY`, totalsValueX, totalsY, { align: "right" });

  const footerY = totalsY + 20;
  doc.setTextColor(40, 40, 50);
  doc.setFontSize(10);
  doc.text("Thank you for shopping with PatiHouse!", 25, footerY);
  
  return doc;
}

// 1. PDF İndir (Mevcut fonksiyon)
export function generateInvoicePdf(order) {
  const doc = createInvoiceDoc(order);
  doc.save(`invoice-${order.id}.pdf`);
}

// 2. PDF Base64 Verisi Döndür (Backend'e göndermek için yeni fonksiyon)
export function getInvoiceBase64(order) {
  const doc = createInvoiceDoc(order);
  // "data:application/pdf;base64,....." formatında döner.
  // Bize sadece virgülden sonrası lazım.
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}