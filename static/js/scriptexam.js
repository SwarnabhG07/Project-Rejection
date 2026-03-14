
const video = document.getElementById('exam-cam');
const recordBtn = document.getElementById('record-btn');
const redoBtn = document.getElementById('redo-btn');
const transcriptionBox = document.getElementById('transcription-box');
const hiddenAnswer = document.getElementById('hidden-answer');
const indicator = document.getElementById('indicator');

// 1. Turn on the floating camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => {
        console.error("Camera/Mic error:", err);
        alert("Please allow camera and microphone access to take this exam.");
    });

// 2. Setup Speech-to-Text with Auto-Restart
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecording = false;
let finalTranscript = '';

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // What happens when you speak
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
        hiddenAnswer.value = finalTranscript + interimTranscript;
    };

    // CRUCIAL: Auto-restart if the browser gets lazy and stops listening
    recognition.onend = () => {
        if (isRecording) {
            console.log("Browser paused listening. Restarting microphone...");
            recognition.start();
        }
    };

    // Error handling
    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Microphone access is blocked! Please check your browser permissions.");
            isRecording = false;
            recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Start Answering';
            recordBtn.classList.remove('recording-active');
            indicator.style.display = 'none';
        }
    };

} else {
    alert("Speech-to-text is not supported in this browser. Please use Chrome or Edge.");
}

// 3. Handle Record Button
recordBtn.addEventListener('click', () => {
    if (!recognition) return;

    if (!isRecording) {
        try {
            recognition.start();
            isRecording = true;
            recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Answering';
            recordBtn.classList.add('recording-active');
            indicator.style.display = 'block';
        } catch (e) {
            console.error("Could not start recognition:", e);
        }
    } else {
        isRecording = false; // Set to false BEFORE stopping so onend doesn't restart it
        recognition.stop();
        recordBtn.innerHTML = '<i class="fas fa-microphone"></i> Resume Answering';
        recordBtn.classList.remove('recording-active');
        indicator.style.display = 'none';
    }
});

// 4. Handle Redo Button
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
    hiddenAnswer.value = '';
});
