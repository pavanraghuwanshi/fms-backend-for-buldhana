const uploadWhatsappPdf = require("../utils/uploadWhatsappPdf");
const sendWhatsappPdfByMediaId = require("../utils/sendWhatsappPdfByMediaId");
const { logAction } = require("../utils/logger");

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

    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'User',
        action: 'SEND_WHATSAPP',
        module: 'BuiltyInvoice',
        recordId: null,
        oldData: null,
        newData: { consignerMobile, consigneeMobile, tpNo, mediaId, fileName },
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        status: 'SUCCESS'
      });
    } catch (logError) {
      console.error("Audit log failed for sendInvoiceWhatsapp:", logError);
    }

    return res.status(200).json({
      message: "Invoice sent successfully on WhatsApp",
    });
  } catch (error) {
    try {
      await logAction({
        userId: req.user?._id || req.user?.id,
        userType: req.user?.role || 'System',
        action: 'SEND_WHATSAPP',
        module: 'BuiltyInvoice',
        recordId: null,
        status: 'FAILED',
        ipAddress: req.ip,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        apiEndpoint: req.originalUrl,
        requestMethod: req.method,
        error: error.message
      });
    } catch (logErr) {}

    return res.status(500).json({
      message: "Error sending invoice on WhatsApp",
      error: error.message,
    });
  }
};