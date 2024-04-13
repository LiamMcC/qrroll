const NodeWebcam = require("node-webcam");
const jsQR = require("jsqr");

// Create webcam instance
const Webcam = NodeWebcam.create({
  width: 1280,
  height: 720,
  output: "jpeg",
  device: false,
  callbackReturn: "base64",
  verbose: false
});

// Function to decode QR code from image data
function decodeQRCode(imageData) {
  const qrCode = jsQR(imageData, imageData.width, imageData.height);
  return qrCode ? qrCode.data : null;
}

// Function to capture image from webcam and decode QR code
function scanQRCode() {
  Webcam.capture("qr_code", async function (err, data) {
    if (err) {
      console.error("Error capturing image:", err);
      return;
    }

    const decodedData = await decodeQRCode(data);
    if (decodedData) {
      console.log("QR Code Data:", decodedData);
    } else {
      console.log("No QR code found.");
    }

    // Continue scanning for QR codes recursively
    scanQRCode();
  });
}

// Start scanning for QR codes
console.log("Scanning for QR codes...");
scanQRCode();
