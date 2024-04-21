const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const qr = require('qrcode');
const path = require('path');

const fs = require('fs');
const app = express();
var bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
// Set the view engine to EJS
app.set('view engine', 'ejs');
app.use(express.static("script")); 
app.use(express.static("qrcodes")); 
app.use(express.static("uploads")); 
app.use(express.static("coms")); 

var timetableData = require('./class.json')

var Email = require("./email.js");
// Set the directory for views
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
var mysql = require('mysql');

// ******************************** Start of SQL **************************************** //
// First we need to tell the application where to find the database
const db = mysql.createPool({
  connectionLimit: 10, // Adjust this value based on your application's needs
  host: '127.0.0.1',
  user: 'root',
  port: '3306',
  password: 'Root',
  database: 'studentrole'
});

// Test the connection pool
db.getConnection((err, connection) => {
  if (err) {
      console.error('Error connecting to the database:', err);
  } else {
      console.log('Database connection pool established successfully');
      connection.release(); // Release the connection back to the pool
  }
});

    


// Define a route to render the index.ejs page
app.get('/', (req, res) => {
  res.render('scanindex');
});


// ************************* Trial QR Route Using Databases 
app.post('/qrdatadb', (req, res) => {
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
  app.get('/attendance_report/:group/:module', (req, res) => {
    const moduleName = req.params.module;
    const groupName = req.params.group;

    // SQL query to get the count of occurrences for each student
    const sqlQuery = `
        SELECT fname, sname, COUNT(DISTINCT scanned_at) AS days_occurred
        FROM qr_codes
        WHERE module = ? AND class = ?
        GROUP BY fname, sname
    `;

    // Execute the SQL query
    db.query(sqlQuery, [moduleName, groupName], (err, result) => {
        if (err) {
            console.error('Error executing SQL query:', err);
            res.status(500).send('Error executing SQL query');
            return;
        }

        // Calculate the total number of unique dates for the module
        const totalUniqueDatesQuery = `
        SELECT COUNT(DISTINCT DATE(scanned_at)) AS total_unique_dates
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



    //*&*&*&*&*&*&*&*&**&*&*&*&**&*&*  Manual attendance entry

 // render all classes 
 app.get('/manualattendance', (req, res) => {
  // SQL query to retrieve unique course names
  const sqlQuery = `
  SELECT DISTINCT class
  FROM qr_codes
`;

// Execute the SQL query
db.query(sqlQuery, (err, result) => {
  if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).send('Error executing SQL query');
      return;
  }

  // Extract the unique course names from the result
  const uniqueCourses = result.map(row => row.class);

  // Render the EJS template with the unique course names
  res.render('manualattendancegroups', { result });
});
});


app.get('/manualattendancemodules/:className', (req, res) => {
  const className = req.params.className;

  // Query the database to retrieve the class schedule for the given className
  const query = `
  SELECT s.module, m.module AS moduleName, s.dayofweek
  FROM schediletable s
  INNER JOIN moduletable m ON s.module = m.id
  INNER JOIN classtable c ON s.class = c.id
  WHERE c.class = ?
  `;

  db.query(query, [className], (err, rows) => {
      if (err) {
          console.error('Error fetching class schedule:', err);
          return res.status(500).send('Error fetching class schedule');
      }

      if (rows.length === 0) {
          // If class not found, handle the error (e.g., render an error page)
          return res.status(404).send('Class not found');
      }

      // Prepare the schedule data to pass to the view
      const schedule = rows.map(row => ({
          module: row.module,
          moduleName: row.moduleName,
          dayOfWeek: row.dayofweek
      }));

      // Render the view with the class schedule data
      res.render('manualmodulespergroup', { className, schedule });
  });
});



    // Route to generate the attendance report
    app.get('/manualattendance/:group/:module', (req, res) => {
      // Query to get all unique dates

       var theGroup = req.params.group
       var theModule = req.params.module

      const uniqueDatesQuery = 'SELECT DISTINCT DATE(scanned_at) AS date FROM qr_codes ORDER BY date';
      
      // Query to get all student names
      const studentNamesQuery = 'SELECT DISTINCT studentNo, CONCAT(fname, " ", sname) AS fullName FROM qr_codes WHERE class = ?';
      
      // Execute both queries
      db.query(uniqueDatesQuery, (err, dates) => {
          if (err) {
              console.error('Error fetching unique dates:', err);
              res.status(500).send('Error fetching unique dates');
              return;
          }
          
          db.query(studentNamesQuery,[theGroup], (err, students) => {
              if (err) {
                  console.error('Error fetching student names:', err);
                  res.status(500).send('Error fetching student names');
                  return;
              }
    
              // Construct the attendance map
              const attendanceMap = {};
              students.forEach(student => {
                  attendanceMap[student.fullName] = { studentNo: student.studentNo }; // Include studentNo
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
                  res.render('manualattendance', { dates, students, attendanceMap, theGroup, theModule });
              });
          });
      });
    });

    // manual attendance entry end


    // Post manual entry
// /changeAttendance/" + studentNo + "/" + tehclass + "/" + module,
    app.post('/changeAttendance/:studentNo', (req, res) => {
      const data = req.body;
    
     console.log(data.studentName + "888888" +   data.studentName, 
     data.date,
     data.studentNo,
     data.tehclass,
     data.module,
     data.dayName,
     data.studentName)
      const originalDate = new Date(data.date);

      const fullName = data.studentName;
      const [fname, sname] = fullName.split(' ');

      // Adjusting for time zone offset
      const adjustedDate = new Date(originalDate.getTime() - (originalDate.getTimezoneOffset() * 60000));
      
      // Format the date in "YYYY-MM-DD HH:mm:ss" format
      const formattedDate = adjustedDate.toISOString().slice(0, 19).replace('T', ' ');
      const insertQuery = 'INSERT INTO qr_codes (content, class, student, cDay, module, studentNo, fname, sname, scanned_at) VALUES (?, ?, ?, ?, ?, ? , ? , ?, ?)';
      db.query(insertQuery, ["Manually Entered", data.tehclass, data.studentName, data.dayName, data.module, data.studentNo, fname, sname, formattedDate ], (err, result) => {
        if (err) {
          console.error('Error inserting QR code data:', err);
          res.status(500).send('Error inserting QR code data');
        } else {
          console.log('QR code data inserted successfully:', data);
          res.sendStatus(200);
        }
      });
      console.log(data);
      // Your logic to update the database
  });

    // post manual entry 

  // attendance grid 


  // *********** Attendance Grid Per Group Per Module 

  app.get('/attendance_grid/:class/:module', (req, res) => {
  
  const classParam = req.params.class;
  const moduleParam = req.params.module;
  // Query to get all unique dates
  const uniqueDatesQuery = `
        SELECT DISTINCT DATE(scanned_at) AS date 
        FROM qr_codes 
        WHERE class = ? AND module = ?
        ORDER BY date
    `;
  
  // Query to get all student names
  const studentNamesQuery = `
        SELECT DISTINCT CONCAT(fname, " ", sname) AS fullName 
        FROM qr_codes 
        WHERE class = ? AND module = ?
    `;
  
  // Execute both queries
  db.query(uniqueDatesQuery,[classParam, moduleParam], (err, dates) => {
      if (err) {
          console.error('Error fetching unique dates:', err);
          res.status(500).send('Error fetching unique dates');
          return;
      }
      
      db.query(studentNamesQuery,[classParam, moduleParam], (err, students) => {
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
          const attendanceQuery = `
        SELECT CONCAT(fname, " ", sname) AS fullName, DATE(scanned_at) AS date, COUNT(*) > 0 AS present 
        FROM qr_codes 
        WHERE class = ? AND module = ?
        GROUP BY fullName, date
    `;


          db.query(attendanceQuery,[classParam, moduleParam], (err, attendanceData) => {
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
              res.render('attendance_module.ejs', { dates, students, attendanceMap, classParam, moduleParam});
          });
      });
  });
});


  // *********** Attendance Grid Per group per module end

  



// Route to render the attendance grid page All Modules , Classes & Students 
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

 

// *************************** Class Groups




// *************************** Class Groups
app.get('/classgroups', (req, res) => {
  //res.send(timetableData)
  const classNames = timetableData.classes.map(item => item.class);
  console.log(classNames)
  res.render('classgroups', {classNames});
});


// app.get('/classmodules/:className', (req, res) => {
//   const className = req.params.className;
  
//   // Find the class with the given className
//   const selectedClass = timetableData.classes.find(item => item.class === className);

//   if (!selectedClass) {
//     // If class not found, handle the error (e.g., render an error page)
//     return res.status(404).send('Class not found');
//   }
// console.log(selectedClass.schedule)
//   // Pass the class schedule data to the view
//   res.render('modulesperclass', { className, schedule: selectedClass.schedule });
// });


app.get('/classmodules/:className', (req, res) => {
  const className = req.params.className;

  // Query the database to retrieve the class schedule for the given className
  const query = `
  SELECT s.module, m.module AS moduleName, s.dayofweek
  FROM schediletable s
  INNER JOIN moduletable m ON s.module = m.id
  INNER JOIN classtable c ON s.class = c.id
  WHERE c.class = ?
  `;

  db.query(query, [className], (err, rows) => {
      if (err) {
          console.error('Error fetching class schedule:', err);
          return res.status(500).send('Error fetching class schedule');
      }

      if (rows.length === 0) {
          // If class not found, handle the error (e.g., render an error page)
          return res.status(404).send('Class not found');
      }

      // Prepare the schedule data to pass to the view
      const schedule = rows.map(row => ({
          module: row.module,
          moduleName: row.moduleName,
          dayOfWeek: row.dayofweek
      }));

      // Render the view with the class schedule data
      res.render('modulesperclass', { className, schedule });
  });
});



// ******************** One QR Code

app.get('/generateqr', (req, res) => {
  res.render('generateqr');
});



app.post('/generateqr', (req, res) => {

  const studentInfo = {
    student_number: req.body.studentno,
    fname: req.body.fname,
    sname: req.body.sname,
    class: req.body.class
  };
  
  const qrData = JSON.stringify(studentInfo);
  
  

  const directory = 'qrcodes';
  var filename = req.body.studentno + ".png" 
const codename = path.join(directory, filename);



  qr.toFile(codename, qrData, (err) => {
    if (err) throw err;
    console.log('QR code generated successfully!');
  });

  
  const insertQuery = 'INSERT INTO student_codes (class, studentNo, fname, sname, codename) VALUES (?, ?, ?, ?, ?)';
  db.query(insertQuery, [req.body.class, req.body.studentno, req.body.fname, req.body.sname, filename ], (err, result) => {
    if (err) {
      console.error('Error inserting QR code data:', err);
      res.status(500).send('Error inserting QR code data');
    } else {
      console.log('QR code data inserted successfully:');
      res.redirect('/');
    }
  });
  

 
});


app.get('/generatemultipleqr', (req, res) => {
  res.render('generatemultipleqr');
});


const upload = multer({ dest: 'uploads/' });

app.post('/generatemultipleqr', upload.single('csvFile'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  const csvFilePath = file.path;
  const csvData = [];

  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => {
      // Process each row of data
      const studentInfo = {
        student_number: data.studentNo,
        fname: data.fname,
        sname: data.sname,
        class: data.class,
        studentemail: data.email
      };

      const qrData = JSON.stringify(studentInfo);
      const directory = 'qrcodes';
      const filename = `${data.studentNo}.png`; 
      const codename = path.join(directory, filename);

      // Generate QR code
      qr.toFile(codename, qrData, (err) => {
        if (err) {
          console.error('Error generating QR code:', err);
        } else {
          console.log('QR code generated successfully!');
          
          // Insert data into the database
          const insertQuery = 'INSERT INTO student_codes (class, studentNo, fname, sname, codename, studentemail) VALUES (?, ?, ?, ?, ?, ?)';
          db.query(insertQuery, [data.class, data.studentNo, data.fname, data.sname, filename, data.email], (err, result) => {
            if (err) {
              console.error('Error inserting QR code data:', err);
            } else {
             // console.log('QR code data inserted successfully');
            }
          });
        }
      });

      csvData.push(data);
    })
    .on('end', () => {
      console.log('All data processed');
      res.redirect('/allcodes');
    });
});



// ******************** One QR Code


// ******************** all Codes
app.get('/allcodes', (req, res) => {

  let sqlcount = 'SELECT * from student_codes ';
  let querycount = db.query(sqlcount,(err,result) => {
    res.render('allcodes', {result});

});
  
});


app.get('/sendallcodes', (req, res) => {
  let sql = 'SELECT * FROM student_codes';
  db.query(sql, (err, result) => {
      if (err) {
          console.error('Error fetching student codes:', err);
          res.status(500).send('Error fetching student codes');
          return;
      }

      // Iterate over each result item
      result.forEach(item => {
        const mailto = item.studentemail
          const studentNo = item.studentNo;
          const codename = item.codename;

          // Send email for each result item
          Email.sendBookingConfirmation(mailto, studentNo, codename)
              .then(() => {
                  console.log(`Email sent for student ${studentNo}`);
              })
              .catch(error => {
                  console.error(`Error sending email for student ${studentNo}:`, error);
              });
      });

      res.redirect('/');
  });
});




// ******************** all Codes


// %%%%%%%%%%%%%%%%%%% Group Modules
app.get('/groupmodules', (req, res) => {
  const query = 'SELECT class FROM classtable';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching class groups:', err);
          res.status(500).send('Error fetching class groups');
          return;
      }

      
      res.render('groupmodules', { results });
  });
});



app.get('/individualgroupmodules/:className', (req, res) => {
  const className = req.params.className;

  // Query the database to retrieve the class schedule for the given className
  const query = `
  SELECT s.module, m.module AS moduleName, s.dayofweek
  FROM schediletable s
  INNER JOIN moduletable m ON s.module = m.id
  INNER JOIN classtable c ON s.class = c.id
  WHERE c.class = ?
  `;

  db.query(query, [className], (err, rows) => {
      if (err) {
          console.error('Error fetching class schedule:', err);
          return res.status(500).send('Error fetching class schedule');
      }

      if (rows.length === 0) {
          // If class not found, handle the error (e.g., render an error page)
          return res.status(404).send('Class not found');
      }

      // Prepare the schedule data to pass to the view
      const schedule = rows.map(row => ({
          module: row.module,
          moduleName: row.moduleName,
          dayOfWeek: row.dayofweek
      }));

      // Render the view with the class schedule data
      res.render('individualgroupmodules', { className, schedule });
  });
});


// %%%%%%%%%%%%%%%%%%% Group Modules End


//&&&&&&&&&&&&&&&&&& Student Overall Attendance 



// list of courses to click on here
app.get('/classgroupsoverall', (req, res) => {
  // SQL query to retrieve unique course names
  const sqlQuery = `
  SELECT DISTINCT class
  FROM qr_codes
`;

// Execute the SQL query
db.query(sqlQuery, (err, result) => {
  if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).send('Error executing SQL query');
      return;
  }

  // Extract the unique course names from the result
  const uniqueCourses = result.map(row => row.class);

  // Render the EJS template with the unique course names
  res.render('classgroupsoverall', { result });
});
});


// list of students per course here

app.get('/classattendance/:group', (req, res) => {
  
  const sqlQuery = `
  SELECT DISTINCT studentNo, CONCAT(fname, ' ', sname) AS fullname, class
  FROM qr_codes
  WHERE class = ?
`;
    
    // Execute the SQL query
    db.query(sqlQuery,[req.params.group], (err, result) => {
        if (err) {
            console.error('Error executing SQL query:', err);
            res.status(500).send('Error executing SQL query');
            return;
        }

        // Extract the distinct full names from the result
        const distinctNames = result.map(row => row.fullname);
console.log(result)
        // Render the EJS template with the distinct full names
        res.render('studentsinclass', { result });
    });
});



app.get('/overallattendance/:group/:studentno', (req, res) => {
  const student = req.params.studentno;
  const groupName = req.params.group;

  // SQL query to get the count of occurrences for each student
  const sqlQuery = `
      SELECT fname, sname,class, studentNo, COUNT(DISTINCT scanned_at) AS days_occurred
      FROM qr_codes
      WHERE studentNo = ? AND class = ?
     
  `;

  // Execute the SQL query
  db.query(sqlQuery, [student, groupName], (err, result) => {
      if (err) {
          console.error('Error executing SQL query:', err);
          res.status(500).send('Error executing SQL query');
          
          return;
      }

      // Calculate the total number of unique dates for the module
      const totalUniqueDatesQuery = `
      SELECT COUNT(DISTINCT DATE(scanned_at)) AS total_unique_dates
      FROM qr_codes
      WHERE class = ?
      `;
      db.query(totalUniqueDatesQuery, [groupName], (err, totalResult) => {
          if (err) {
              console.error('Error executing SQL query:', err);
              res.status(500).send('Error executing SQL query');
              
              return;
          }

          // Extract the total number of unique dates
         

          // Render the EJS template with the result
          res.render('overallattendance', { totalResult, result });
      });
  });
});

//&&&&&&&&&&&&&&&&&& Student Overall Attendance End



 
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


// Email.bookingConfirmed(email)