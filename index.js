const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.use(express.static("script")); 
// Set the directory for views
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
var mysql = require('mysql');

// ******************************** Start of SQL **************************************** //
// First we need to tell the application where to find the database
const db = mysql.createConnection({
    host: '127.0.0.1',
        user: 'root',
        port: '3306',
        password: 'Root',
        database: 'studentrole'
     });
    
    // Next we need to create a connection to the database
    
    db.connect((err) =>{
         if(err){
            console.log("go back and check the connection details. Something is wrong.")
        } 
         else{
            console.log('Looking good the database connected')
        }
    })
    


// Define a route to render the index.ejs page
app.get('/', (req, res) => {
  res.render('scanindex');
});


// Route to handle QR code data
app.post('/qrdata', (req, res) => {
    const { data, currentTime } = req.body;
  
    // Load class schedule from class.json
    const classSchedule = JSON.parse(fs.readFileSync('class.json', 'utf8'));
  
    const currentDate = new Date();
    const dayOfWeek = getDayOfWeek(currentDate);
  
    console.log("The Time is " + currentTime);
    console.log(dayOfWeek);
  
    // Check if the day is in the schedule and if currentTime falls within any time range
    if (classSchedule.schedule[dayOfWeek]) {
      const modules = classSchedule.schedule[dayOfWeek];
      const currentHourMinute = currentTime.split(':');
      const currentHour = parseInt(currentHourMinute[0]);
      const currentMinute = parseInt(currentHourMinute[1]);
  
      for (const module of modules) {
        const timeRange = module.time.split(' - ');
        const startTime = timeRange[0].split(':');
        const endTime = timeRange[1].split(':');
        const startHour = parseInt(startTime[0]);
        const startMinute = parseInt(startTime[1]);
        const endHour = parseInt(endTime[0]);
        const endMinute = parseInt(endTime[1]);
  
        if (
          currentHour > startHour || 
          (currentHour === startHour && currentMinute >= startMinute)
        ) {
          if (
            currentHour < endHour || 
            (currentHour === endHour && currentMinute <= endMinute)
          ) {
            console.log(`You have ${module.module} class now!`);
            // Do something with the module, such as storing it in the database
          }
        }
      }
    }
  
    if (data) {
      console.log(data);
      const insertQuery = 'INSERT INTO qr_codes (content) VALUES (?)';
      db.query(insertQuery, [data], (err, result) => {
        if (err) {
          console.error('Error inserting QR code data:', err);
          res.status(500).send('Error inserting QR code data');
        } else {
          console.log('QR code data inserted successfully:', data);
          res.sendStatus(200);
        }
      });
    } else {
      res.status(400).send('Missing QR code data');
    }
  });
  
  // Function to get the day of the week as a string (e.g., "Monday", "Tuesday")
  function getDayOfWeek(date) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = date.getDay();
    return daysOfWeek[dayIndex];
  }



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
