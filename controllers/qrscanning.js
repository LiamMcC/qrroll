var express = require('express');
var router = express.Router();

var db = require('../db');
router.use(require('./user'))
router.use((req, res, next) => {
  res.locals.cookies = req.cookies;
  next();
});
// Define a route to render the index.ejs page
router.get('/', (req, res) => {
  console.log(req.user)
    res.render('scanindex', { user: req.user});
  });
  
  
  // ************************* Trial QR Route Using Databases 
  router.post('/qrdatadb', (req, res) => {
    const { data, currentTime } = req.body;
    const qrData = JSON.parse(data); // Parse JSON data
    const cgroup = qrData.class;
  
    const currentDate = new Date();
    const dayOfWeek = getDayOfWeek(currentDate);
  
    console.log("The Time is " + currentTime);
    console.log(dayOfWeek);
  
    // Query class schedule for the specified class and day of the week
    const query = `
        SELECT m.module AS moduleName, s.starttime, s.endtime
        FROM schediletable s
        INNER JOIN moduletable m ON s.module = m.id
        INNER JOIN classtable c ON s.class = c.id
        WHERE c.class = ? AND s.dayofweek = ?
    `;
  
    db.query(query, [cgroup, dayOfWeek], (err, rows) => {
        if (err) {
            console.error('Error fetching class schedule:', err);
            res.status(500).send('Error fetching class schedule');
            return;
        }
  
        // Iterate over each module in the schedule
        rows.forEach(row => {
            const startTime = row.starttime;
            const endTime = row.endtime;
            const themodule = row.moduleName
            const currentHourMinute = currentTime.split(':');
            const currentHour = parseInt(currentHourMinute[0]);
            const currentMinute = parseInt(currentHourMinute[1]);
  
            // Parse start time and end time
            const startHourMinute = startTime.split(':');
            const startHour = parseInt(startHourMinute[0]);
            const startMinute = parseInt(startHourMinute[1]);
  
            const endHourMinute = endTime.split(':');
            const endHour = parseInt(endHourMinute[0]);
            const endMinute = parseInt(endHourMinute[1]);
  
            // Check if the current time falls within the module time range
            if (
                (currentHour > startHour || (currentHour === startHour && currentMinute >= startMinute)) &&
                (currentHour < endHour || (currentHour === endHour && currentMinute <= endMinute))
            ) {
                // Insert module data into the database
                if (data) {
                    console.log(data);
                    const qrData = JSON.parse(data); // Parse JSON data
                    const fname = qrData.fname;
                    const sname = qrData.sname;
                    const sno = qrData.student_number;
                    const name = fname + " " + sname
  
                    const insertQuery = 'INSERT INTO qr_codes (content, class, student, cDay, module, studentNo, fname, sname) VALUES (?, ?, ?, ?, ?, ? , ? , ?)';
                    db.query(insertQuery, [data, cgroup, name, dayOfWeek, themodule, sno, fname, sname], (err, result) => {
                        if (err) {
                            console.error('Error inserting QR code data:', err);
                            res.status(500).send('Error inserting QR code data');
                        } else {
                            console.log('QR code data inserted successfully:', data);
                        }
                    });
                } else {
                    console.log('Missing QR code data');
                    res.status(400).send('Missing QR code data');
                    return; // Return to avoid further processing
                }
            }
        });
  
        // Send response once all processing is done
        res.sendStatus(200);
    });
  });
  
  
  // ************************* Trial QR Route Using Databases 
  
  
  // Route to handle QR code data
  router.post('/qrdata', (req, res) => {
      const { data, currentTime } = req.body;
      const qrData = JSON.parse(data); // Parse JSON data
      const cgroup = qrData.class;
    
      // Load class schedule from class.json
      const classSchedule = JSON.parse(fs.readFileSync('class.json', 'utf8'));
    
      const currentDate = new Date();
      const dayOfWeek = getDayOfWeek(currentDate);
    
      console.log("The Time is " + currentTime);
      console.log(dayOfWeek);
    
      // Check if the class schedule for the specified class exists
      if (classSchedule.classes) {
        // Find the schedule for the specified class
        const classInfo = classSchedule.classes.find(classInfo => classInfo.class === cgroup);
        
        if (classInfo && classInfo.schedule[dayOfWeek]) {
          const modules = classInfo.schedule[dayOfWeek];
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
                if (data) {
                  console.log(data);
                  const qrData = JSON.parse(data); // Parse JSON data
                  const fname = qrData.fname;
                  const sname = qrData.sname;
                  const sno = qrData.student_number;
                  const name = fname + " " + sname
                  
                  const insertQuery = 'INSERT INTO qr_codes (content, class, student, cDay, module, studentNo, fname, sname) VALUES (?, ?, ?, ?, ?, ? , ? , ?)';
                  db.query(insertQuery, [data, cgroup, name, dayOfWeek, module.module, sno, fname, sname ], (err, result) => {
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
                console.log(`You have ${module.module} class now!`);
                // Do something with the module, such as storing it in the database
              }
            }
          }
        }
      }
    });
    
    // Function to get the day of the week as a string (e.g., "Monday", "Tuesday")
    function getDayOfWeek(date) {
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayIndex = date.getDay();
      return daysOfWeek[dayIndex];
    }
    

module.exports = router;