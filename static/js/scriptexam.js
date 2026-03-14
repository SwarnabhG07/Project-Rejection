// --- 1. Dynamic Question Loading ---

// ==========================================
// 0. FULLSCREEN & ANTI-CHEAT LOGIC
// ==========================================
const startOverlay = document.getElementById('start-overlay');
const enterFullscreenBtn = document.getElementById('enter-fullscreen-btn');
let violationCount = 0;
const MAX_VIOLATIONS = 3;

// 1. Enter Fullscreen & Dismiss Overlay
if (enterFullscreenBtn) {
    enterFullscreenBtn.addEventListener('click', async () => {
        try {
            // Trigger browser fullscreen
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
                await document.documentElement.webkitRequestFullscreen();
            }
            
            // Hide the overlay to reveal the exam
            startOverlay.style.display = 'none'; 
        } catch (err) {
            alert("Fullscreen access is required to take this exam.");
        }
    });
}

// 2. Monitor Tab Switching
document.addEventListener("visibilitychange", () => {
    // Only count violations if the exam has actually started (overlay is gone)
    if (document.visibilityState === 'hidden' && startOverlay.style.display === 'none') {
        violationCount++;
        
        if (violationCount >= MAX_VIOLATIONS) {
            terminateExam();
        } else {
            alert(`⚠️ WARNING: You left the exam tab!\n\nViolation ${violationCount} of ${MAX_VIOLATIONS}. Your exam will be terminated on the 3rd violation.`);
        }
    }
});

// 3. Terminate Exam Function
function terminateExam() {
    // Stop speech recognition if running
    if (typeof recognition !== 'undefined' && isRecording) {
        recognition.stop();
        isRecording = false;
    }
    
    // Shut off the camera
    const videoElement = document.getElementById('exam-cam');
    if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
    document.getElementById('cam-container').style.display = 'none';

    // Force exit fullscreen
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }

    // Replace the exam UI with a red Termination screen
    document.getElementById('exam-ui').innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
            <i class="fas fa-times-circle" style="font-size: 60px; color: #dc3545; margin-bottom: 20px;"></i>
            <h2 style="color: #dc3545;">Exam Terminated</h2>
            <p style="color: #666; margin-top: 10px;">You have exceeded the maximum number of tab-switching violations.</p>
            <button onclick="window.location.href='/'" class="btn" style="background: #dc3545; color: white; margin: 30px auto 0; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Return to Dashboard</button>
        </div>
    `;
    
    // Optional: Send a fetch() request to FastAPI here to mark the candidate as "Failed/Cheated" in your database
}

const questionText = document.getElementById('question-text');

async function loadCurrentQuestion() {
    questionText.innerText = "Generating technical question... Please wait.";
    
    try {
        const response = await fetch('/api/question');
        const data = await response.json();
        
        if (!response.ok) {
            questionText.innerText = data.error || "Error loading question from server.";
            return;
        }

        if (data.is_complete) {
            finishExam();
        } else {
            questionText.innerText = data.question;
        }
    } catch (error) {
        console.error("Failed to fetch question:", error);
        questionText.innerText = "Network error while loading question.";
    }
}

// Trigger first load when the page opens
loadCurrentQuestion();

// --- 2. Camera & Speech Setup ---
const video = document.getElementById('exam-cam');
const recordBtn = document.getElementById('record-btn');
const redoBtn = document.getElementById('redo-btn');
const transcriptionBox = document.getElementById('transcription-box');
const indicator = document.getElementById('indicator');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => {
        console.error("Camera/Mic error:", err);
        alert("Please allow camera and microphone access to take this exam.");
    });

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecording = false;
let finalTranscript = '';

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + ' ';
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        transcriptionBox.value = finalTranscript + interimTranscript;
    };

    recognition.onend = () => {
        if (isRecording) {
            try { recognition.start(); } catch(e) {}
        }
    };
}

// --- 3. Buttons (Record & Redo) ---
recordBtn.addEventListener('click', () => {
    if (!recognition) return;
    if (!isRecording) {
        try {
            finalTranscript = transcriptionBox.value;
            recognition.start();
            isRecording = true;
            recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Answering';
            recordBtn.classList.add('recording-active');
            indicator.style.display = 'block';
        } catch (e) {}
    } else {
        isRecording = false;
        recognition.stop();
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Resume Answering';
        recordBtn.classList.remove('recording-active');
        indicator.style.display = 'none';
    }
});

redoBtn.addEventListener('click', () => {
    if (isRecording) {
        isRecording = false;
        recognition.stop();
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Answering';
        recordBtn.classList.remove('recording-active');
        indicator.style.display = 'none';
    }
    finalTranscript = '';
    transcriptionBox.value = '';
});

// --- 4. Submit & Next Question Logic (Real API Connection) ---
const examForm = document.getElementById('exam-form');
const submitBtn = document.getElementById('submit-btn');

examForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Prevent double submissions and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI is Evaluating...';

    // Grab the transcribed text
    const formData = new FormData();
    formData.append('spoken_answer', transcriptionBox.value);

    try {
        // Send answer to the backend
        const response = await fetch('/submit-answer', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        if (data.is_complete) {
            finishExam();
        } else {
            // Success: Clean up the UI for the next question
            transcriptionBox.value = '';
            finalTranscript = '';
            
            if (isRecording) {
                isRecording = false;
                recognition.stop();
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Answering';
                recordBtn.classList.remove('recording-active');
                indicator.style.display = 'none';
            }
            
            // Fetch and display the newly generated question
            await loadCurrentQuestion();
        }
    } catch (error) {
        console.error("Error submitting answer:", error);
        alert("Failed to submit answer to the AI agent. Please check your network.");
    } finally {
        // Only re-enable the button if the exam isn't complete
        if (document.getElementById('exam-ui')) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Answer <i class="fas fa-arrow-right"></i>';
        }
    }
});

// Helper function to handle exam completion
function finishExam() {
    document.getElementById('exam-ui').innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
            <i class="fas fa-check-circle" style="font-size: 60px; color: #198754; margin-bottom: 20px;"></i>
            <h2>Assessment Completed</h2>
            <p style="color: #666; margin-top: 10px;">Your technical evaluation is being finalized by the AI.</p>
            <button onclick="window.location.href='/'" class="btn btn-submit" style="margin: 30px auto 0;">Return to Dashboard</button>
        </div>
    `;
    
    // Shut off the webcam light when done
    const stream = document.getElementById('exam-cam').srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('cam-container').style.display = 'none';
}
