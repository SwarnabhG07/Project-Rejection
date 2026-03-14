
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileDisplay = document.getElementById('file-display');

// 1. Trigger hidden file input when clicking the button or the drop zone
uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevents double-firing if clicking the button inside the drop zone
    fileInput.click();
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

// 2. Handle Drag and Drop Visuals
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

// 3. Handle File Drop
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');

    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// 4. Handle File Browse Selection
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// 5. Validate and Process the File
function handleFile(file) {
    // Allow PDFs and Word Docs
    const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes

    if (!validTypes.includes(file.type)) {
        alert('Invalid file type! Please upload a PDF or DOCX file.');
        return;
    }

    if (file.size > maxSize) {
        alert('File is too large! Maximum size is 5MB.');
        return;
    }

    // Update the UI to show success
    fileDisplay.innerHTML = `<i class="fas fa-check-circle"></i> Successfully attached: ${file.name}`;
    fileDisplay.style.display = 'block';
    uploadBtn.textContent = 'Change Resume';

    // Note: In a real app, you would use FormData and fetch() here to send 'file' to your server.
    console.log("Ready to send to server:", file.name);
}
