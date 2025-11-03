const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['one-time', 'recurring'],
    required: true,
  },
  timestamp: {
    type: Number,
    required: true,
  },
  interval: {
    type: Number, // Only used if type is 'recurring'
  },
  payload: {
    command: {
      type: String,
      required: true,
    },
  },
});

module.exports = mongoose.model('Job', jobSchema);
