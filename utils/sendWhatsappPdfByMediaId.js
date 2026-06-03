const axios = require("axios");

const sendWhatsappPdfByMediaId = async ({
  mobile,
  mediaId,
  fileName,
  caption = "Your TP/Builty invoice",
}) => {
  try {
    if (!mobile) {
      throw new Error("mobile is required");
    }

    if (!mediaId) {
      throw new Error("mediaId is required");
    }

  const response = await axios.post(
  `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
  {
    messaging_product: "whatsapp",
    to: String(mobile).replace("+", ""),
    type: "document",
    document: {
      id: mediaId,
      filename: fileName,
      caption,
    },
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.whatApp_access_token}`,
      "Content-Type": "application/json",
    },
  }
);
    return response.data;
  } catch (error) {
    console.log(
      "WhatsApp PDF Send Error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to send PDF on WhatsApp");
  }
};

module.exports = sendWhatsappPdfByMediaId;