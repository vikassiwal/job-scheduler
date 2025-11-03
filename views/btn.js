document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".remove-job").forEach(btn => {
      btn.addEventListener("click", async function () {
        const name = this.getAttribute("data-name");
        const timestamp = Number(this.getAttribute("data-timestamp")); // Ensure number
  
        const res = await fetch('/delete-job', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, timestamp })
        });
  
        const data = await res.json();
  
        if (data.success) {
         
          this.closest("tr").remove();
        } else {
          alert("❌ Failed to delete the job.");
        }
      });
    });
  });