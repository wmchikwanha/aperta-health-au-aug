import type jsPDF from "jspdf";

export const PILOT_WATERMARK = "PILOT — SYNTHETIC DATA — NOT A CLINICAL RECORD";

/**
 * Stamps the pilot watermark into the header and footer of every page of a jsPDF document.
 * Call immediately before doc.save().
 */
export const applyPilotWatermark = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 30, 45);
    doc.text(PILOT_WATERMARK, pageWidth / 2, 4, { align: "center" });
    doc.text(PILOT_WATERMARK, pageWidth / 2, pageHeight - 3, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }
};

/** Label attached to exported FHIR bundles and other machine-readable exports. */
export const pilotExportMeta = () => ({
  pilot: true,
  notice: PILOT_WATERMARK,
  generated_at: new Date().toISOString(),
});
