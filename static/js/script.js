const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileDisplay = document.getElementById('file-display');
const submitBtn = document.getElementById('submit-btn');

if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
}

if (dropZone) {
    dropZone.addEventListener('click', (e) => {
        if (e.target.id === 'submit-btn') return;
        fileInput.click();
    });

    // Handle Drag and Drop Visuals
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    // Handle File Drop
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files; // Assign dropped file to the hidden input
            handleFile(e.dataTransfer.files[0]);
        }
    });
}

// Handle File Browse Selection
if (fileInput) {
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

// Validate and Process the File
function handleFile(file) {
    const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        alert('Invalid file type! Please upload a PDF or DOCX file.');
        return;
    }

    if (file.size > maxSize) {
        alert('File is too large! Maximum size is 5MB.');
        return;
    }

    // Show the success message
    fileDisplay.innerHTML = `<i class="fas fa-check-circle"></i> Ready to upload: ${file.name}`;
    fileDisplay.style.display = 'block';

    // Hide the original browse button and show the submit button
    if (uploadBtn) uploadBtn.style.display = 'none';
    if (submitBtn) submitBtn.style.display = 'block';
}

// ==========================================
// 2. SKILLS LOGIC
// ==========================================
const skillInput = document.getElementById('skill-input');
const addSkillBtn = document.getElementById('add-skill-btn');
const skillsContainer = document.getElementById('skills-container');
const hiddenSkillsInput = document.getElementById('hidden-skills-input');

let skills = [];

if (addSkillBtn) {
    addSkillBtn.addEventListener('click', () => {
        const skill = skillInput.value.trim();
        if (!skill) return;

        skills.push(skill);
        skillInput.value = '';

        const pill = document.createElement('span');
        pill.className = 'skill-pill';
        pill.innerHTML = `${skill} <i class="fas fa-times" data-skill="${skill}"></i>`;
        skillsContainer.appendChild(pill);

        hiddenSkillsInput.value = JSON.stringify(skills);
    });
}

if (skillsContainer) {
    skillsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('fa-times')) {
            const skill = e.target.dataset.skill;
            skills = skills.filter(s => s !== skill);
            e.target.parentElement.remove();
            hiddenSkillsInput.value = JSON.stringify(skills);
        }
    });
}

const skillsForm = document.getElementById('skills-form');
if (skillsForm) {
    skillsForm.addEventListener('submit', async function (e) {
        // 1. Stop the browser from navigating away and showing the JSON
        e.preventDefault(); 
        
        hiddenSkillsInput.value = JSON.stringify(skills);
        
        const submitBtn = skillsForm.querySelector('.btn-save');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = "Saving...";
        submitBtn.disabled = true;

        const formData = new FormData(skillsForm);

        try {
            // 2. Send the data asynchronously
            const response = await fetch('/save-skills', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                submitBtn.textContent = "Saved Successfully";
                submitBtn.style.backgroundColor = "#198754"; // Turn green
            } else {
                alert("Failed to save skills.");
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            console.error("Error saving skills:", error);
            alert("Network error occurred.");
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

const companyDropZone = document.getElementById('company-drop-zone');
const companyFileInput = document.getElementById('company-file-input');
const companyUploadBtn = document.getElementById('company-upload-btn');
const companyFileDisplay = document.getElementById('company-file-display');
const companySubmitBtn = document.getElementById('company-submit-btn');

if (companyUploadBtn) {
    companyUploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        companyFileInput.click();
    });
}

if (companyDropZone) {
    companyDropZone.addEventListener('click', (e) => {
        if (e.target.id === 'company-submit-btn') return;
        
        companyFileInput.click();
    });

    companyDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        companyDropZone.classList.add('dragover');
    });

    companyDropZone.addEventListener('dragleave', () => {
        companyDropZone.classList.remove('dragover');
    });

    companyDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        companyDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            companyFileInput.files = e.dataTransfer.files;
            handleCompanyFile(e.dataTransfer.files[0]);
        }
    });
}

if (companyFileInput) {
    companyFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleCompanyFile(e.target.files[0]);
        }
    });
}

function handleCompanyFile(file) {
    const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        alert('Invalid file type! Please upload a PDF or DOCX file.');
        return;
    }

    if (file.size > maxSize) {
        alert('File is too large! Maximum size is 5MB.');
        return;
    }

    companyFileDisplay.innerHTML = `<i class="fas fa-check-circle"></i> Ready to upload: ${file.name}`;
    companyFileDisplay.style.display = 'block';

    if (companyUploadBtn) companyUploadBtn.style.display = 'none';
    if (companySubmitBtn) companySubmitBtn.style.display = 'block';
}

// Intercept the company document form submission
const companyForm = companySubmitBtn.closest('form');

if (companyForm) {
    companyForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop the black screen JSON reload

        companySubmitBtn.value = "Ingesting Document...";
        companySubmitBtn.disabled = true;

        const formData = new FormData(companyForm);

        try {
            const response = await fetch('/upload-company-doc', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "An error occurred during upload.");
                companySubmitBtn.value = "Submit Document";
                companySubmitBtn.disabled = false;
                return;
            }

            // Success state
            companyFileDisplay.innerHTML = `<i class="fas fa-check-circle"></i> Document indexed successfully!`;
            companySubmitBtn.value = "Uploaded Successfully";
            companySubmitBtn.style.backgroundColor = "#6c757d"; // Gray out the button
            
        } catch (error) {
            console.error("Company doc upload error:", error);
            alert("Failed to connect to the server.");
            companySubmitBtn.value = "Submit Document";
            companySubmitBtn.disabled = false;
        }
    });
}

const resumeForm = document.getElementById('resume-form');
const startExamLink = document.getElementById('start-exam-link');

if (resumeForm) {
    resumeForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop the page from reloading
        
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.value = "Processing...";
        submitBtn.disabled = true;

        const formData = new FormData(resumeForm);

        try {
            const response = await fetch('/resume-upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            // Catch the custom missing skills error from Python
            if (!response.ok) {
                alert(data.error || "An error occurred.");
                submitBtn.value = "Submit to Server";
                submitBtn.disabled = false;
                return;
            }

            // Check the RAG Engine result
            if (data.is_match === "yes" || data.is_match === true) {
                alert("Match found! The exam is now unlocked.");
                startExamLink.style.display = 'block'; // Unhide the button!
                submitBtn.value = "Uploaded Successfully";
                submitBtn.style.backgroundColor = "#6c757d"; // Turn gray to show it's done

                const steps = document.querySelectorAll('.timeline .step');
                
                // 1. Mark 'Resume Upload' (Index 1) as completed
                steps[1].className = 'step completed';
                steps[1].querySelector('.step-icon').innerHTML = '<i class="fas fa-check"></i>';
                steps[1].querySelector('.step-subtitle').innerText = '(Green Check)';

                // 2. Mark 'Take Assessment' (Index 2) as active
                steps[2].className = 'step active';
                steps[2].querySelector('.step-icon').innerHTML = '<i class="fas fa-laptop-code"></i>';
                steps[2].querySelector('.step-subtitle').innerText = '(Action Required)';
                steps[2].querySelector('.step-subtitle').style.color = '';
            } else {
                alert("Candidate profile does not match required skills. Exam remains locked.");
                submitBtn.value = "Submit to Server";
                submitBtn.disabled = false;
            }

        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to connect to the server.");
            submitBtn.value = "Submit to Server";
            submitBtn.disabled = false;
        }
    });
}
