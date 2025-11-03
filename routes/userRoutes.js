const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateMe,
  updatePassword,
  deleteMe
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/', registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/password', protect, updatePassword);
router.delete('/me', protect, deleteMe);

module.exports = router;