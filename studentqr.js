const qr = require('qrcode');
const fs = require('fs');

const studentInfo = {
  student_number: 1234567,
  name: 'Mark Delaney',
  class: 'Bx334'
};

const qrData = JSON.stringify(studentInfo);

qr.toFile('studentqr.png', qrData, (err) => {
  if (err) throw err;
  console.log('QR code generated successfully!');
});