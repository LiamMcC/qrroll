require('dotenv').config();
var nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {

    }
});

module.exports = class Email {
    // Function to send booking confirmation email
    static sendBookingConfirmation(mailto, studentNo, codename) {
        return new Promise((resolve, reject) => {
            // Setup email data
            var mailOptions = {
                from: 'QR Code <nowitsbooked@gmail.com>',
                replyTo: 'nowitsbooked@gmail.com',
                to: mailto, // Use the recipient email passed as a parameter
                subject: 'QR Code For Attendance',
                html: `<p>Dear Student,</p>
                       <p>Your QR Code for college attendance is attached. This is unique to your student number
                        ${studentNo}.</p>`,
                attachments: [
                    {
                        filename: codename, // Change filename as needed
                        path: 'qrcodes/' + codename // Dynamic path to image attachment
                    }
                ]
            };

            // Send email
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error);
                    reject(error);
                } else {
                    console.log('Email sent: ' + info.response);
                    resolve(info);
                }
            });
        });
    }
};
