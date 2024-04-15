const qr = require('qrcode');
const fs = require('fs');

const studentInfo = {
  student_number: 1235555,
  fname: 'Will',
  sname: 'Willson',
  class: 'Software1'
};

const qrData = JSON.stringify(studentInfo);

qr.toFile('willy.png', qrData, (err) => {
  if (err) throw err;
  console.log('QR code generated successfully!');
});