const qr = require('qrcode');
const fs = require('fs');

const studentInfo = {
  student_number: 1235555,
  fname: 'Richard',
  sname: 'Willson',
  class: 'Animation'
};

const qrData = JSON.stringify(studentInfo);

qr.toFile('richard.png', qrData, (err) => {
  if (err) throw err;
  console.log('QR code generated successfully!');
});