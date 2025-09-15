const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { adminCreateUser, adminUpdateUser, adminDeleteUser } = require('../controllers/userAdminController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roles');

// /api/auth/register
router.post('/register', authController.register);
// /api/auth/login
router.post('/login', authController.login);


router.post('/users',    auth, allow('admin'), adminCreateUser);
router.patch('/users/:id', auth, allow('admin'), adminUpdateUser);
router.delete('/users/:id', auth, allow('admin'), adminDeleteUser);

module.exports = router;
