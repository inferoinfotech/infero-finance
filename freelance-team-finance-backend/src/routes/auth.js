const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { adminCreateUser, adminUpdateUser, adminDeleteUser, adminListUsers, adminGetUser } = require('../controllers/userAdminController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// /api/auth/register
router.post('/register', authController.register);
// /api/auth/login
router.post('/login', authController.login);


router.post('/users',    auth, allow('admin'), adminCreateUser);
router.patch('/users/:id', auth, allow('admin'), adminUpdateUser);
router.delete('/users/:id', auth, allow('admin'), adminDeleteUser);
router.get('/users',        auth, allow('admin'), adminListUsers);   // list with optional ?search=&page=&limit=
router.get('/users/:id',    auth, allow('admin'), adminGetUser); 

module.exports = router;
