const qr = require('qrcode');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

const studentInfo = {
  student_number: 1234567,
  fname: 'Jimbob',
  sname: 'Joe',
  class: 'Bx334'
};

const qrData = JSON.stringify(studentInfo);

qr.toDataURL(qrData, (err, url) => {
  if (err) throw err;
  
  const canvas = createCanvas(300, 300); // Adjust the canvas size as needed
  const ctx = canvas.getContext('2d');
  
  // Load the QR code image
  loadImage(url).then((image) => {
    ctx.drawImage(image, 0, 0);
    
    // Add text
    ctx.font = '20px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText(studentInfo.class, canvas.width / 2, canvas.height - 20); // Position the text at the bottom
    
    // Save the image
    const out = fs.createWriteStream('jimbobr_with_text.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    
    console.log('QR code with text generated successfully!');
  });
});
