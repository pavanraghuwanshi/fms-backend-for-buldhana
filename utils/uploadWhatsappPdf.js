const axios = require("axios");
const FormData = require("form-data");

const uploadWhatsappPdf = async (pdfBuffer, fileName) => {
  try {
    const form = new FormData();

    form.append("messaging_product", "whatsapp");

    form.append("file", pdfBuffer, {
      filename: fileName.trim(),
      contentType: "application/pdf",
      knownLength: pdfBuffer.length,
    });

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()}/media?access_token=${process.env.whatApp_access_token?.trim()}`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data.id;
  } catch (error) {
    console.log("WhatsApp PDF Upload Error:", error.response?.data || error.message);
    throw new Error("Failed to upload PDF to WhatsApp");
  }
};

module.exports = uploadWhatsappPdf;