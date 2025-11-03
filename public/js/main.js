
document.addEventListener('DOMContentLoaded', function() {
   
    const jobTypeRadios = document.querySelectorAll('input[name="type"]');
    const intervalContainer = document.getElementById('intervalContainer');

    if (jobTypeRadios && intervalContainer) {
        jobTypeRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'recurring') {
                    intervalContainer.style.display = 'block';
                    document.getElementById('interval').setAttribute('required', 'required');
                } else {
                    intervalContainer.style.display = 'none';
                    document.getElementById('interval').removeAttribute('required');
                }
            });
        });
    }

   
    const addJobForm = document.getElementById('addJobForm');
    if (addJobForm) {
        addJobForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
          
            const name = document.getElementById('jobName').value;
            const type = document.querySelector('input[name="type"]:checked').value;
            const dateTimeInput = document.getElementById('jobDateTime').value;
            const command = document.getElementById('command').value;
            
            // Converting datetime to timestamp (in seconds)
            const timestamp = Math.floor(new Date(dateTimeInput).getTime() / 1000);
            
            // Making job object
            const jobData = {
                name: name,
                type: type,
                timestamp: timestamp,
                payload: {
                    command: command
                }
            };
            
            // Add interval if it's a recurring job
            if (type === 'recurring') {
                jobData.interval = parseInt(document.getElementById('interval').value);
            }
            
           
            fetch('/api/add-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(jobData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.job) {
                    // Show success message
                    document.getElementById('successAlert').style.display = 'block';
                    document.getElementById('errorAlert').style.display = 'none';
                    // Reset form
                    addJobForm.reset();
                    // Redirect to dashboard after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                } else {
                    throw new Error('Failed to add job');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                document.getElementById('errorAlert').style.display = 'block';
                document.getElementById('successAlert').style.display = 'none';
            });
        });
    }

  
    const removeButtons = document.querySelectorAll('.remove-job');
    if (removeButtons) {
        removeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const timestamp = parseInt(this.getAttribute('data-timestamp'));
                
                if (confirm(`Are you sure you want to remove job "${name}"?`)) {
                    fetch('/api/remove-job', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name, timestamp })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.message) {
                            // For refreshing the page to show updated job list
                            window.location.reload();
                        } else {
                            throw new Error('Failed to remove job');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Failed to remove job. Please try again.');
                    });
                }
            });
        });
    }
});