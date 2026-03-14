// --- 1. 5 Dummy Questions ---
const questions = [
    "Explain the difference between let, const, and var in JavaScript.",
    "What is an API, and how would you explain it to someone who doesn't write code?",
    "Describe a time you encountered a difficult bug. How did you troubleshoot and solve it?",
    "What are the main differences between relational and non-relational databases?",
    "Explain the concept of Object-Oriented Programming (OOP) and its core principles."
];

let currentQuestionIndex = 0;
const questionText = document.getElementById('question-text');

// Load the question without the counter text
function loadCurrentQuestion() {
    questionText.innerText = questions[currentQuestionIndex];
}
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


// --- 4. Submit & Next Question Logic (API Commented Out) ---
const examForm = document.getElementById('exam-form');
const submitBtn = document.getElementById('submit-btn');

examForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Disable button so they don't click twice
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting...';

    const formData = new FormData(examForm);
    formData.append('question_text', questions[currentQuestionIndex]);

    try {
        // ==========================================
        // REAL API CALL (Currently Commented Out)
        // ==========================================
        /*
        const apiResponse = await fetch('/submit-answer', {
            method: 'POST',
            body: formData
        });
        */

        // ==========================================
        // FAKE API CALL (For testing the frontend UI)
        // ==========================================
        // This creates a fake 1-second delay so you can see the "Submitting..." button work
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = { ok: true }; // Simulating a successful backend response


        if (response.ok) {
            currentQuestionIndex++;

            if (currentQuestionIndex < questions.length) {
                // Move to the next question
                loadCurrentQuestion();
                transcriptionBox.value = '';
                finalTranscript = '';

                if (isRecording) {
                    isRecording = false;
                    recognition.stop();
                    recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Answering';
                    recordBtn.classList.remove('recording-active');
                    indicator.style.display = 'none';
                }
            } else {
                // EXAM IS OVER! Show completion screen
                document.getElementById('exam-ui').innerHTML = `
                    <div style="text-align: center; padding: 40px 0;">
                        <i class="fas fa-check-circle" style="font-size: 60px; color: #198754; margin-bottom: 20px;"></i>
                        <h2>Exam Completed!</h2>
                        <p style="color: #666; margin-top: 10px;">Your answers have been recorded successfully.</p>
                        <button onclick="window.location.href='/'" class="btn btn-submit" style="margin: 30px auto 0;">Return to Dashboard</button>
                    </div>
                `;
                // Turn off the camera
                const stream = video.srcObject;
                if (stream) {
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                }
                document.getElementById('cam-container').style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred during submission.");
    } finally {
        // Re-enable the submit button if the exam isn't over yet
        if (currentQuestionIndex < questions.length) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Answer <i class="fas fa-arrow-right"></i>';
        }
    }
});
