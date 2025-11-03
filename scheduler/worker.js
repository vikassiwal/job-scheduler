const Job = require('../models/jobModel');
const { exec } = require('child_process');
let jobQueue = []; 
let isProcessing = false;
const jobMap = new Map(); 


module.exports = (io) => {
  
  async function addToQueue(job) {
    try {
      jobQueue.push(job);
      console.log(`Job "${job.name}" added to the queue`);

     
      const jobToSave = { ...job };
      delete jobToSave._id;

      const newJob = new Job(jobToSave);
      await newJob.save();
      console.log(`Job "${job.name}" saved to the database`);
      
      
      if (!isProcessing) {
        processQueue();
      }
    } catch (error) {
      console.error(`Failed to add job "${job.name}":`, error);
    }
  }

  
  async function processQueue() {
    isProcessing = true;

    while (jobQueue.length > 0) {
      const job = jobQueue.shift();
      console.log(`Executing job: "${job.name}"`);

      await executeJob(job);

      await Job.updateOne({ _id: job._id }, { $set: { status: 'completed' } });

      if(job.type === 'recurring') {
        const nextTime = job.timestamp + job.interval;
        const existingJobs = jobMap.get(nextTime) || [];
        existingJobs.push(job);
        jobMap.set(nextTime, existingJobs);
      }
    }

    isProcessing = false;
  }

  
  function executeJob(job) {
    return new Promise((resolve) => {
      const command = job.payload.command;

      if (!command) {
        console.error(`Invalid command for job: "${job.name}"`);
        io.emit('job-result', { jobId: job._id, name: job.name, command, success: false, message: 'No command provided' });
        return resolve();
      }

      exec(command, (error, stdout, stderr) =>{
        if (error) {
          console.error(` Execution failed for "${job.name}": ${error.message}`);
          io.emit('job-result', {
            jobId: job._id,
            name: job.name,
            command,
            success: false,
            message: `Error: ${error.message}`
          });
          return resolve();
        }

        if (stderr && stderr.toLowerCase().includes('error')) {
          console.error(`stderr output in "${job.name}": ${stderr}`);
          io.emit('job-result', {
            jobId: job._id,
            name: job.name,
            command,
            success: false,
            message: `Error in output: ${stderr}`
          });
        } else {
          console.log(`Job "${job.name}" executed:\n${stdout}`);
          io.emit('job-result', {
            jobId: job._id,
            name: job.name,
            command,
            success: true,
            message: `Successfully executed: ${stdout.trim()}`
          });
        }

        resolve();
      });
    });
  }

  
  function startWorker() {
    console.log('Worker started, bro!');
  }

  return { addToQueue, executeJob, startWorker };
};
