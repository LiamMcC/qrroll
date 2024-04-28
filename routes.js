var express = require('express');

var router = express.Router();
var bodyParser = require("body-parser") // call body parser module and make use of it
router.use(bodyParser.urlencoded({extended:true}));

router.use(require('./controllers/qrscanning'))
router.use(require('./controllers/user'))
router.use(require('./controllers/admin'))
//router.use(require('./controller/sdata'))



module.exports = router;