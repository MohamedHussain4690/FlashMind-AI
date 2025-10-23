import os
import io
import json
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import PyPDF2
from docx import Document
import google.generativeai as genai

load_dotenv()
app = Flask(__name__)
CORS(app)

MAX_FILES = 2
MAX_FILE_SIZE_MB = 10
app.config['MAX_CONTENT_LENGTH'] = (MAX_FILES * MAX_FILE_SIZE_MB * 1024 * 1024) + (1024 * 1024)
ALLOWED_EXTENSIONS = {'pdf', 'docx'}

try:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    genai.configure(api_key=api_key)
    
    MODEL_NAME = 'gemini-2.5-flash-lite-preview-09-2025'
    model = genai.GenerativeModel(MODEL_NAME)
    print(f"✅ Gemini AI configured successfully with model: {MODEL_NAME}")

except Exception as e:
    print(f"❌ FAILED to configure Gemini AI: {e}")
    model = None
    MODEL_NAME = "Not Configured"

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_stream):
    try:
        pdf_reader = PyPDF2.PdfReader(file_stream)
        return "".join(page.extract_text() + "\n" for page in pdf_reader.pages).strip()
    except Exception as e:
        print(f"❌ PDF Extraction Error: {e}")
        raise ValueError(f"Could not read the PDF file. It might be corrupted or encrypted.")

def extract_text_from_docx(file_stream):
    try:
        doc = Document(file_stream)
        return "\n".join(para.text for para in doc.paragraphs).strip()
    except Exception as e:
        print(f"❌ DOCX Extraction Error: {e}")
        raise ValueError(f"Could not read the DOCX file.")

@app.route('/')
def home():
    return jsonify({
        'message': 'AI Flashcard Generator API is running!',
        'status': 'success' if model else 'error',
        'model_in_use': MODEL_NAME
    })

@app.route('/generate', methods=['POST'])
def generate_flashcards():
    if not model:
        return jsonify({'error': 'AI model is not configured. Check server logs.'}), 503

    try:
        uploaded_files = request.files.getlist('files')
        
        topic = request.form.get('topic', '')
        content = request.form.get('content', '')
        num_cards = int(request.form.get('num_cards', 5))
        
        print(f"Received request for topic: '{topic}' with {len(uploaded_files)} file(s).")
        
        if not topic:
            return jsonify({'error': 'Topic is required.'}), 400

        extracted_texts = []
        if len(uploaded_files) > 0 and uploaded_files[0].filename != '':
            if len(uploaded_files) > MAX_FILES:
                return jsonify({'error': f'Cannot upload more than {MAX_FILES} files.'}), 400

            for file in uploaded_files:
                if not (file and allowed_file(file.filename)):
                    return jsonify({'error': f'Invalid file type or name: {file.filename}'}), 400
                
                file_stream = io.BytesIO(file.read())
                ext = file.filename.rsplit('.', 1)[1].lower()
                
                if ext == 'pdf': text = extract_text_from_pdf(file_stream)
                elif ext == 'docx': text = extract_text_from_docx(file_stream)
                
                extracted_texts.append(text)
                print(f"✅ Extracted {len(text)} chars from {file.filename}")

        final_content = content
        if extracted_texts:
            files_content = "\n\n--- Document Content ---\n\n".join(extracted_texts)
            final_content = f"{content}\n\n{files_content}".strip()


        if final_content:
            prompt = f"""
            System: You are a helpful assistant that generates educational materials.
            User: Based on the topic "{topic}" and the provided content below, create exactly {num_cards} high-quality flashcards.

            Content:
            ---
            {final_content[:15000]}
            ---

            Your task is to respond with ONLY a valid JSON array of objects. Each object must have a "question" and an "answer" key. Do not add any other text, explanations, or markdown formatting like ```json.
            """
        else:
            prompt = f"""
            System: You are a helpful assistant that generates educational materials.
            User: Create exactly {num_cards} flashcards about the topic: "{topic}".
            Respond with ONLY a valid JSON array of objects, with "question" and "answer" keys.
            """
        print(f"⏳ Calling Gemini API with model: {MODEL_NAME}...")
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        print(f"✅ Gemini Response Received. Length: {len(response_text)}")

        match = re.search(r'\[.*\]', response_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON array found in the AI response.")
            
        json_str = match.group(0)
        flashcards = json.loads(json_str)

        if not isinstance(flashcards, list):
            raise ValueError("AI response was not a valid list.")
            
        print(f"✅ Successfully parsed {len(flashcards)} flashcards.")
        return jsonify({'success': True, 'flashcards': flashcards[:num_cards]})

    except Exception as e:
        print(f"❌ AN ERROR OCCURRED: {type(e).__name__}: {e}")
        if 'response_text' in locals():
            print(f"--- RAW AI RESPONSE THAT CAUSED ERROR ---\n{response_text}\n---------------------------------------")
        return jsonify({'error': 'An internal server error occurred. Please check the server logs for details.'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)