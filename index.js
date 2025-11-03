const express = require('express');
const path = require('path');
const connectDB = require('./db.js');

connectDB();

const mongoose = require('mongoose');
const jobRoutes = require('./routes/jobRoutes');
const authRoutes = require('./routes/userRoutes');
const Job = require('./models/jobModel');
const http = require('http');
const { Server } = require('socket.io');
const worker = require('./scheduler/worker');
const { jobMap, loadJobsFromDB } = require('./scheduler/jobMap');
const cookieParser = require('cookie-parser');
const { protect, authorize } = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize worker with io
const { addToQueue, executeJob, startWorker } = worker(io);

// Pass addToQueue to scheduler
const { startScheduler } = require('./scheduler/scheduler')(addToQueue);

const PORT = process.env.PORT || 3000;

// Set up EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// rate limiter middleware here
const window = new Map();
const allowedTime = 10 * 1000;
const maxRequests = 5;

app.use((req, res, next) => {
  const ip = req.ip;
  const currentTime = Date.now();

  if (!window.has(ip)) {
    window.set(ip, []);
  }

  const timeArray = window.get(ip);
  while (timeArray.length > 0 && currentTime - timeArray[0] > allowedTime) {
    timeArray.shift();
  }

  if (timeArray.length >= maxRequests) {
    return res.status(429).send('Too many requests. Please try again later.');
  }

  timeArray.push(currentTime);
  window.set(ip, timeArray);
  next();
});

const session = require('express-session');
const flash = require('connect-flash');

app.use(session({
  secret: process.env.SESSION_SECRET || 'secretKey',
  resave: false,
  saveUninitialized: true
}));

app.use(flash());

// Set global variables for templates
app.use(async (req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  
  // Check if user is logged in from JWT token in cookie
  if (req.cookies.token) {
    try {
      const decoded = jwt.verify(
        req.cookies.token,
        process.env.JWT_SECRET || 'your_jwt_secret'
      );
      const user = await User.findById(decoded.id);
      res.locals.user = user;
      req.user = user;
    } catch (err) {
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }
  
  next();
});

// Public routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Job Scheduler - Home' });
});

app.get('/login', (req, res) => {
  if (res.locals.user) {
    return res.redirect('/dashboard');
  }
  res.render('login', { 
    title: 'Login',
    message: req.query.message
  });
});

app.get('/register', (req, res) => {
  if (res.locals.user) {
    return res.redirect('/dashboard');
  }
  res.render('register', { title: 'Register' });
});

// Protected routes
app.get('/dashboard', protect, async (req, res) => {
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    const jobs = await Job.find({ timestamp: { $gte: currentTime } }).sort({ timestamp: 1 });
    res.render('dashboard', { 
      title: 'Dashboard', 
      jobs,
      currentTime 
    });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).render('dashboard', { 
      title: 'Dashboard', 
      jobs: [],
      error: 'Failed to fetch jobs'
    });
  }
});

app.get('/add-job', protect, (req, res) => {
  res.render('addJob', { title: 'Add New Job' });
});

app.get('/job-list', protect, async (req, res) => {
  try {
    const jobs = await Job.find().sort({ timestamp: 1 });
    res.render('jobList', { 
      title: 'All Jobs', 
      jobs
    });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).render('jobList', { 
      title: 'All Jobs', 
      jobs: [],
      error: 'Failed to fetch jobs'
    });
  }
});

app.get('/delete-all-jobs', protect, /*authorize('admin'),*/ (req, res) => {
  res.render('deleteAllConfirmation', { title: 'Delete All Jobs' });
});

app.get('/profile', protect, async (req, res) => {
  const jobs = await Job.find({ user: req.user._id }).sort({ createdAt: -1 }) || [];
  if (!req.user) {
    return res.redirect('/login');
  }

  res.render('profile', { 
    title: 'User Profile',
    user: req.user,
    jobs: jobs
  });
});

app.post('/api/delete-all-jobs', protect, /*authorize('admin'),*/ async (req, res) => {
  try {
    await Job.deleteMany({}); 
    console.log(' All jobs deleted');
    jobMap.clear(); 
    res.status(200).send('All jobs deleted');
  } catch (err) {
    console.error('Error deleting all jobs:', err);
    res.status(500).send('Error deleting jobs');
  }
});

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api', protect, jobRoutes);

// Error handling middleware


app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      message: 'API route not found'
    });
  }
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you are looking for does not exist'
  });
});


connectDB()
  .then(async () => {
    console.log(' Connected to MongoDB');
    await loadJobsFromDB();
    startScheduler();
    startWorker();
    server.listen(PORT, () => {
      console.log(` Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(' Failed to connect to DB:', err);
  });
