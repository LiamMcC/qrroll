var express = require('express');
var router = express.Router();
var bodyParser = require("body-parser")

var db = require('../db');
router.use(require('./user'))

router.use(bodyParser.urlencoded({extended:true}));
router.use(bodyParser.json());

router.use((req, res, next) => {
  res.locals.cookies = req.cookies;
  next();
});

function isAdmin(req, res, next) {
	// if user is authenticated in the session, carry on
	if (req.user.adminr)
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/notadmin');
}


function isVerified(req, res, next) {
	// if user is authenticated in the session, carry on
	if (req.user.email_verified)
		return next();
	// if they aren't redirect them to the home page
	res.redirect('/verifyneeded');
}

// Middleware to check if user is authenticated
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/notadmin');
}


router.get('/notadmin', (req, res) => {
    console.log(req.user)
      res.render('notadmin', { user: req.user});
    });



router.get('/admin', isLoggedIn, isVerified, isAdmin,(req, res) => {
    console.log(req.user)
      res.render('admin', { user: req.user});
    });



    router.get('/allusers',isLoggedIn, isVerified, isAdmin,(req, res) => {
      const query = 'SELECT id, realname, adminr, email_verified FROM users';
      db.query(query, (err, results) => {
          if (err) {
              console.error('Error fetching class groups:', err);
              res.status(500).send('Error fetching class groups');
              return;
          }
    
          
          res.render('allusers', { results, user: req.user });
      });
    });




    router.post('/makeAdmin/:id',isLoggedIn, isVerified, isAdmin,(req, res) => {
      const query = 'update users set adminr = ? where id = ?';
      db.query(query, [1, req.params.id],(err, results) => {
          if (err) {
              console.error('Error fetching class groups:', err);
              res.status(500).send('Error fetching class groups');
              return;
          } else {
            res.sendStatus(200);
          }
         
    
          
       //   res.render('allusers', { results, user: req.user });
      });
    });



    router.post('/verifyuser/:id',isLoggedIn, isVerified, isAdmin,(req, res) => {
      const query = 'update users set email_verified = ? where id = ?';
      db.query(query, [1, req.params.id],(err, results) => {
          if (err) {
              console.error('Error fetching class groups:', err);
              res.status(500).send('Error fetching class groups');
              return;
          } else {
            res.sendStatus(200);
          }
         
    
          
       //   res.render('allusers', { results, user: req.user });
      });
    });




    router.get('/timetable',isLoggedIn, isVerified, isAdmin,(req, res) => {
      const query = 'SELECT id, realname, adminr, email_verified FROM users';
      db.query(query, (err, results) => {
          if (err) {
              console.error('Error fetching class groups:', err);
              res.status(500).send('Error fetching class groups');
              return;
          }
    
          
          res.render('timetable', { results, user: req.user });
      });
    });

    router.get('/allclasses',(req, res) => {
      const query = 'select * from classtable';
      db.query(query, (err, results) => {
        
          if (err) {
              console.error('Error fetching class groups:', err);
              res.status(500).send('Error fetching class groups');
              return;
          }
    
          
          res.render('allclasses', { results, user: req.user });
      });
    });



    router.get('/classmodules/:className', (req, res) => {
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
          res.render('modulesperclass', { className, schedule, user: req.user});
      });
    });



    router.get('/managemodules/:id',  (req, res) => {
      const query = `SELECT st.*, mt.module, mt.id
      FROM schediletable st
      JOIN moduletable mt ON st.module = mt.id
      WHERE st.class = ?`;
      
      db.query(query, [req.params.id], (err, results) => {
        console.log(results)
        if (err) {
          console.error('Error fetching class modules:', err);
          res.status(500).json({ error: 'Error fetching class modules' });
          return;
        }
    
        // Extracting modules from the results
        const modules = results.map(row => ({ id: row.id, module: row.module }));
        res.json({ modules });
    
        // Send the modules data back as JSON
       
      });
    });


    router.post('/removemodules', (req, res) => {
      const { classId, selectedModules } = req.body;
      console.log('Class ID:', classId);
      console.log('Selected Modules:', selectedModules);
  
      // Iterate over the selected modules
      selectedModules.forEach(moduleId => {
          const query = 'DELETE FROM schediletable WHERE class = ? AND module = ?';
          db.query(query, [classId, moduleId], (err, results) => {
              if (err) {
                  console.error('Error deleting module:', moduleId, err);
                  return res.status(500).json({ error: 'Error deleting module' });
              }
              console.log('Module deleted:', moduleId);
          });
      });
  
      // Send success response after all modules are deleted
      res.sendStatus(200);
  });
  


  router.get('/listallmodules',  (req, res) => {
    const query = `SELECT * FROM moduletable where id not in (select module from schediletable)`;
    
    db.query(query, [parseInt(req.params.id)], (err, results) => {
      console.log(results)
      if (err) {
        console.error('Error fetching class modules:', err);
        res.status(500).json({ error: 'Error fetching class modules' });
        return;
      }
  
      // Extracting modules from the results
      const modules = results.map(row => ({ id: row.id, module: row.module }));
      res.json({ modules });
  console.log(modules)
      // Send the modules data back as JSON
     
    });
  });

  router.post('/addmodules', (req, res) => {
    const { classId, selectedModules } = req.body;
    console.log('Class ID:', classId);
    console.log('Selected Modules:', selectedModules);

    // Iterate over the selected modules
    selectedModules.forEach(moduleId => {
        const query = 'insert into schediletable (class, module, dayofWeek, starttime, endtime) values (?, ?, ?, ?, ?) ';
        db.query(query, [classId, moduleId, "Monday", "9:00", "9:00"], (err, results) => {
            if (err) {
                console.error('Error deleting module:', moduleId, err);
                return res.status(500).json({ error: 'Error deleting module' });
            }
            console.log('Module added:', moduleId);
        });
    });

    // Send success response after all modules are deleted
    res.sendStatus(200);
});

  

router.get('/schedules/:id',(req, res) => {
  const query = `SELECT 
  (SELECT class FROM classtable WHERE id = st.class) AS class_name,
  st.starttime,
  st.endtime,
  (select module from moduletable where id = st.module) AS module_name,
  st.dayofweek 
FROM 
  schediletable st 
WHERE 
  st.class = ?;`;
  db.query(query,[req.params.id], (err, results) => {
    
      if (err) {
          console.error('Error fetching class groups:', err);
          
          res.status(500).send('Error fetching class groups');
          return;
      }
      console.error(results);
      
      res.render('schedules', { results, user: req.user });
  });
});


router.get('/editschedules/:id',(req, res) => {
  const query = `SELECT id, module, (SELECT id FROM classtable WHERE id = st.class) AS class_id,
  (SELECT class FROM classtable WHERE id = st.class) AS class_name,
  st.starttime,
  st.endtime,
  (select module from moduletable where id = st.module) AS module_name,
  st.dayofweek 
FROM 
  schediletable st 
WHERE 
  st.class = ?;`;
  db.query(query,[req.params.id], (err, results) => {
    
      if (err) {
          console.error('Error fetching class groups:', err);
          
          res.status(500).send('Error fetching class groups');
          return;
      }
      console.error(results);
      
      res.render('editschedules', { results, user: req.user });
  });
});



router.get('/deletetimeslo/:id/:group',(req, res) => {
  const query = 'delete from schediletable where id = ?';
  db.query(query,[req.params.id], (err, results) => {
    
      if (err) {
          console.error('Error fetching class groups:', err);
          res.status(500).send('Error fetching class groups');
          return;
      }

      
      res.redirect('/editschedules/' + req.params.group);
  });
});



router.post('/savechanges', (req, res) => {
  // Extract the updates from the request body
  const updates = req.body.updates;

  // Log the received updates
  console.log('Received updates:', updates);

  updates.forEach(update => {
    const { moduleId, dayOfWeek, startTime, endTime, rowId } = update;
    const query = 'UPDATE schediletable SET dayofweek = ?, starttime = ?, endtime = ? WHERE id = ?';
    db.query(query, [dayOfWeek, startTime, endTime, rowId], (err, results) => {
      if (err) {
        console.error('Error updating row:', moduleId, err);
        // You may want to handle errors or send a response accordingly
      } else {
        console.log('Row updated:', moduleId);
      }
    });
  });

  // Send a response (optional)
  res.sendStatus(200);
});






module.exports = router;