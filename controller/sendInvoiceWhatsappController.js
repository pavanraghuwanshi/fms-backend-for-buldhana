const uploadWhatsappPdf = require("../utils/uploadWhatsappPdf");
const sendWhatsappPdfByMediaId = require("../utils/sendWhatsappPdfByMediaId");

exports.sendInvoiceWhatsapp = async (req, res) => {
  try {
    const { consignerMobile, consigneeMobile, tpNo } = req.body;

    if (!consignerMobile && !consigneeMobile) {
  return res.status(400).json({
    message: "At least one mobile number is required",
  });
}

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    const fileName = `${tpNo || "builty-invoice"}.pdf`;

    const mediaId = await uploadWhatsappPdf(req.file.buffer, fileName);

    console.log(mediaId,";;;;;;;;;;;;;;;;;;")

    if (consignerMobile) {
      await sendWhatsappPdfByMediaId({
        mobile: consignerMobile,
        mediaId,
        fileName,
      });
    }

    if (consigneeMobile) {
      await sendWhatsappPdfByMediaId({
        mobile: consigneeMobile,
        mediaId,
        fileName,
      });
    }

    return res.status(200).json({
      message: "Invoice sent successfully on WhatsApp",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error sending invoice on WhatsApp",
      error: error.message,
    });
  }
};