const Job = require('../models/jobModel');


const jobMap = new Map();


function addJobToMap(job) {
  const ts = job.timestamp;
  if (!ts) {
    console.error("❌ Tried to add job with no timestamp:", job);
    return;
  }

  
  if (!jobMap.has(ts)) jobMap.set(ts, []);
  jobMap.get(ts).push(job);
}


async function loadJobsFromDB() {
  const now = Math.floor(Date.now() / 1000);
  const futureJobs = await Job.find({ timestamp: { $gte: now } });

  futureJobs.forEach(job => {
    addJobToMap(job);
    console.log(`📦 Loaded job: ${job.name} scheduled at ${job.timestamp}`);
  });

  console.log(`✅ Total ${futureJobs.length} jobs loaded into jobMap.`);
}



async function removeJobFromMap(name, timestamp) {
  if (!name || !timestamp) {
    console.error('❌ Name and timestamp are required.');
    return;
  }

  if (jobMap.has(timestamp)) {
    const jobs = jobMap.get(timestamp);
    const updatedJobs = jobs.filter(job => job.name !== name);

    if (updatedJobs.length === 0) {
      jobMap.delete(timestamp);
      console.log(`✅ All jobs at timestamp ${timestamp} removed from map.`);
    } else {
      jobMap.set(timestamp, updatedJobs);
      console.log(`✅ Job "${name}" removed from timestamp ${timestamp} in map.`);
    }
  } else {
    console.log(`ℹ️ No jobs found at timestamp ${timestamp} in jobMap, proceeding with DB deletion.`);
  }

  
  try {
    const result = await Job.deleteOne({ name, timestamp });
    if (result.deletedCount > 0) {
      console.log(`✅ Job "${name}" removed from the database.`);
    } else {
      console.warn(`⚠️ No job found in DB with name "${name}" and timestamp ${timestamp}.`);
    }
  } catch (err) {
    console.error(`❌ Error removing job from DB: ${err.message}`);
  }
}

  



function rescheduleJob(job) {
    const { timestamp, interval, type, _id } = job;
  
    if (type === 'recurring' && interval) {
      const newTimestamp = timestamp + interval;
  
     
      let newJob = job.toObject ? job.toObject() : JSON.parse(JSON.stringify(job));

      /*
      delete newJob._id; // Check karna h 
      newJob.timestamp = newTimestamp;
  */
     
      removeJobFromMap(_id, timestamp);
  
     
      addJobToMap(newJob);
  
    
      Job.create(newJob)
        .then(savedJob => {
          console.log(`🔁 Rescheduled job "${savedJob.name}" to timestamp ${newTimestamp}`);
        })
        .catch(err => {
          console.error(`❌ Failed to save rescheduled job "${newJob.name}":`, err);
        });
    }
  }
  
  


module.exports = {
  jobMap,
  addJobToMap,
  loadJobsFromDB,
  removeJobFromMap,
  rescheduleJob
};
