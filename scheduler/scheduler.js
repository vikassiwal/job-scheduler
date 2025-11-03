const { jobMap, removeJobFromMap, addJobToMap } = require('./jobMap');
const Job = require('../models/jobModel');

module.exports = (addToQueue) => { 
  function startScheduler() {
    setInterval(async () => {
      const currentTime = Math.floor(Date.now() / 1000); 

      const jobsToRun = jobMap.get(currentTime);
      if (jobsToRun && jobsToRun.length > 0) {
        console.log(`Found ${jobsToRun.length} job(s) at ${currentTime}`);

      
        for (const job of jobsToRun) {
          if (!job || !job._id) {
            console.error("Skipping invalid job:", job);
            continue;
        }  

         
          const jobObject = job instanceof Job ? job.toObject() : job;
           
         
          addToQueue(jobObject);

         
          removeJobFromMap(jobObject.name, jobObject.timestamp);

         
          if (jobObject.type === 'recurring') {
            const nextTime = Math.floor(Date.now() / 1000) + jobObject.interval;

           
            let existingJobs = jobMap.get(nextTime);

            
            if (!existingJobs) {
              existingJobs = [];
              jobMap.set(nextTime, existingJobs); 
            }

           
            existingJobs.push({ ...jobObject, timestamp: nextTime });

            console.log(`Rescheduled recurring job "${jobObject.name}" for ${nextTime}`);
          }
        }

       
        jobMap.delete(currentTime);
      }
    }, 1000); 
  }

  return { startScheduler };
};
