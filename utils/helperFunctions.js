const sharp = require("sharp");

// Function to compress and convert image to Base64
exports.compressImage = async (image) => {
  try {
    const mime = image.mimetype;
    if (mime.startsWith("image/")) {
      const compressedBuffer = await sharp(image.buffer).jpeg({ quality: 60 }).toBuffer();
      return {
        base64Data: compressedBuffer.toString("base64"),
        contentType: mime
      };
    } else if (mime === "application/pdf") {
      return {
        base64Data: image.buffer.toString("base64"),
        contentType: mime
      };
    }
    throw new Error("Unsupported file type");
  } catch (error) {
    console.error("Image compression error:", error);
    throw new Error("Image compression failed");
  }
};

exports.getDuration = (start, end) => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const durationInSeconds = (endTime - startTime) / 1000;

  const days = Math.floor(durationInSeconds / (3600 * 24));
  const hours = Math.floor((durationInSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);

  let result = '';
  if (days > 0) result += `${days}D `;
  if (hours > 0 || days > 0) result += `${hours}H `;
  result += `${minutes}M`;

  return result.trim();
}