import pdfplumber
from flask import Flask, request, render_template, jsonify
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.route('/', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        file = request.files.get('pdf_file')
        if file and file.filename.endswith('.pdf'):
            # Save file securely
            file_path = os.path.join(UPLOAD_FOLDER, secure_filename(file.filename))
            file.save(file_path)

            # Read PDF using pdfplumber
            all_text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    all_text += page.extract_text() or ""
            return jsonify(message=all_text)

    return render_template("index.html")


if __name__ == '__main__':
    app.run(debug=True)
