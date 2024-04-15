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
  



  app.get('/roll', function(req, res){

    let sqlcount = 'SELECT COUNT(DISTINCT content) AS unique_count FROM qr_codes WHERE class = ? ';
    let querycount = db.query(sqlcount,['Software1'],(err,result) => {
 console.log(result[0].unique_count)

});

        //WHERE class = ?  and module = ? GROUP BY content
        let sql = 'select * from qr_codes ';
            let query = db.query(sql,['Software1'],(err,result) => {
         res.render('roll', {result, user: req.user});
   
  });
  
     
    });



    // ************************ ATtendance per module inc fraction & % 
    function calculateAttendance(records, moduleName) {
      // Filter records for the specified module
      const moduleRecords = records.filter(record => record.module === moduleName);
      
      // Count unique dates
      const uniqueDates = [...new Set(moduleRecords.map(record => record.scanned_at.toDateString()))];
      const totalDates = uniqueDates.length;
      
      // Calculate attendance fraction and percentage for each student
      const attendanceStats = {};
      moduleRecords.forEach(record => {
          const key = `${record.studentNo}_${record.fname}_${record.sname}`;
          if (!attendanceStats[key]) {
              attendanceStats[key] = { attended: 0, total: 0 };
          }
          attendanceStats[key].total++;
          if (uniqueDates.includes(record.scanned_at.toDateString())) {
              attendanceStats[key].attended++;
          }
      });
      
      // Calculate attendance percentage and absent percentage
      const report = [];
      for (const [key, stats] of Object.entries(attendanceStats)) {
          const [studentNo, fname, sname] = key.split('_');
          const attendancePercentage = (stats.attended / totalDates) * 100;
          const absentPercentage = 100 - attendancePercentage;
          report.push({
              studentNo,
              fname,
              sname,
              attendanceFraction: `${stats.attended}/${totalDates}`,
              attendancePercentage: attendancePercentage.toFixed(2),
              absentPercentage: absentPercentage.toFixed(2)
          });
      }
      
      return report;
  }
  
  // Route to generate the attendance report
  app.get('/attendance_report', (req, res) => {
    const moduleName = 'Software';

    // SQL query to get the count of occurrences for each student
    const sqlQuery = `
        SELECT fname, sname, COUNT(DISTINCT scanned_at) AS days_occurred
        FROM qr_codes
        WHERE module = ?
        GROUP BY fname, sname
    `;

    // Execute the SQL query
    db.query(sqlQuery, [moduleName], (err, result) => {
        if (err) {
            console.error('Error executing SQL query:', err);
            res.status(500).send('Error executing SQL query');
            return;
        }

        // Calculate the total number of unique dates for the module
        const totalUniqueDatesQuery = `
            SELECT COUNT(DISTINCT scanned_at) AS total_unique_dates
            FROM qr_codes
            WHERE module = ?
        `;
        db.query(totalUniqueDatesQuery, [moduleName], (err, totalResult) => {
            if (err) {
                console.error('Error executing SQL query:', err);
                res.status(500).send('Error executing SQL query');
                return;
            }

            // Extract the total number of unique dates
            const totalUniqueDates = totalResult[0].total_unique_dates;

            // Calculate the percentage of attendance for each student
            const attendanceReport = result.map(student => ({
                fname: student.fname,
                sname: student.sname,
                daysOccurred: student.days_occurred,
                percentage: (student.days_occurred / totalUniqueDates) * 100
            }));

            // Render the EJS template with the result
            res.render('attendance_report', { moduleName, attendanceReport, totalUniqueDates });
        });
    });
});


//const totalUniqueDates = result[0].total_unique_dates;

    // ************************ ATtendance per module inc fraction & %  End




  // attendance grid 

// Route to render the attendance grid page
app.get('/attendance_grid', (req, res) => {
  // Query to get all unique dates
  const uniqueDatesQuery = 'SELECT DISTINCT DATE(scanned_at) AS date FROM qr_codes ORDER BY date';
  
  // Query to get all student names
  const studentNamesQuery = 'SELECT DISTINCT CONCAT(fname, " ", sname) AS fullName FROM qr_codes';
  
  // Execute both queries
  db.query(uniqueDatesQuery, (err, dates) => {
      if (err) {
          console.error('Error fetching unique dates:', err);
          res.status(500).send('Error fetching unique dates');
          return;
      }
      
      db.query(studentNamesQuery, (err, students) => {
          if (err) {
              console.error('Error fetching student names:', err);
              res.status(500).send('Error fetching student names');
              return;
          }

          // Construct the attendance map
          const attendanceMap = {};
          students.forEach(student => {
              attendanceMap[student.fullName] = {};
              dates.forEach(date => {
                  attendanceMap[student.fullName][date.date] = false;
              });
          });

          // Query to get attendance data for each student on each date
          const attendanceQuery = 'SELECT CONCAT(fname, " ", sname) AS fullName, DATE(scanned_at) AS date, COUNT(*) > 0 AS present FROM qr_codes GROUP BY fullName, date';

          db.query(attendanceQuery, (err, attendanceData) => {
              if (err) {
                  console.error('Error fetching attendance data:', err);
                  res.status(500).send('Error fetching attendance data');
                  return;
              }

              // Update the attendance map based on the fetched data
              attendanceData.forEach(row => {
                  attendanceMap[row.fullName][row.date] = row.present;
              });

              // Render the attendance grid page with fetched data
              res.render('attendance_grid.ejs', { dates, students, attendanceMap });
          });
      });
  });
});

  // attendance grid end 

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
