// ==========================================
// 1. RESUME UPLOAD LOGIC
// ==========================================
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileDisplay = document.getElementById('file-display');
const submitBtn = document.getElementById('submit-btn');

// Trigger hidden file input when clicking the button or the drop zone
if (uploadBtn) {
    uploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
}

if (dropZone) {
    dropZone.addEventListener('click', () => {
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
    skillsForm.addEventListener('submit', function() {
        hiddenSkillsInput.value = JSON.stringify(skills);
    });
}