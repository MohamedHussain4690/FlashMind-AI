from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS (allows React frontend to communicate with Flask backend)
CORS(app)

# Configure Gemini AI with API key from .env file
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Initialize Gemini model
model = genai.GenerativeModel('gemini-1.5-flash')


# Root route - Test if backend is running
@app.route('/')
def home():
    return jsonify({
        'message': 'AI Flashcard Generator API is running!',
        'status': 'success',
        'endpoints': {
            '/generate': 'POST - Generate flashcards'
        }
    })


# Generate flashcards route
@app.route('/generate', methods=['POST'])
def generate_flashcards():
    try:
        # Get data from frontend request
        data = request.json
        topic = data.get('topic', '')
        content = data.get('content', '')
        num_cards = data.get('num_cards', 5)

        # Validate input - topic is required
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400

        # Create AI prompt based on whether content is provided
        if content:
            # User provided study material
            prompt = f"""
            You are an expert educator. Generate exactly {num_cards} educational flashcards based on the following topic and content.
            
            Topic: {topic}
            Content: {content}
            
            Create {num_cards} question-answer pairs that test key concepts from the content.
            
            IMPORTANT: You must respond with ONLY a valid JSON array in this exact format:
            [
                {{"question": "What is the main concept of X?", "answer": "The main concept is Y"}},
                {{"question": "How does Z work?", "answer": "Z works by doing A"}}
            ]
            
            Rules:
            1. Return ONLY the JSON array, nothing else
            2. No markdown formatting, no code blocks, no explanations
            3. Questions should be clear and specific
            4. Answers should be concise but complete
            5. Create exactly {num_cards} flashcards
            """
        else:
            # No content provided, generate from topic only
            prompt = f"""
            You are an expert educator. Generate exactly {num_cards} educational flashcards about the topic: {topic}
            
            Create {num_cards} question-answer pairs that test key concepts about {topic}.
            
            IMPORTANT: You must respond with ONLY a valid JSON array in this exact format:
            [
                {{"question": "What is {topic}?", "answer": "A clear definition"}},
                {{"question": "What are key features of {topic}?", "answer": "Key features include..."}}
            ]
            
            Rules:
            1. Return ONLY the JSON array, nothing else
            2. No markdown formatting, no code blocks, no explanations
            3. Questions should be clear and specific
            4. Answers should be concise but complete
            5. Create exactly {num_cards} flashcards
            """

        # Call Gemini AI to generate flashcards
        print(f"Generating {num_cards} flashcards about: {topic}")
        response = model.generate_content(prompt)
        
        # Extract the response text
        response_text = response.text.strip()
        print(f"AI Response: {response_text[:100]}...")  # Print first 100 chars for debugging

        # Clean up response (remove markdown code blocks if present)
        if response_text.startswith('```'):
            # Remove markdown code blocks
            response_text = response_text.split('```')[1]
            if response_text.startswith('json'):
                response_text = response_text[4:]
            response_text = response_text.strip()

        # Parse JSON response
        flashcards = json.loads(response_text)
        
        # Validate that we got a list
        if not isinstance(flashcards, list):
            raise ValueError("AI did not return a valid list of flashcards")
        
        # Ensure we have the right number of cards
        flashcards = flashcards[:num_cards]
        
        # Validate each flashcard has question and answer
        for card in flashcards:
            if 'question' not in card or 'answer' not in card:
                raise ValueError("Invalid flashcard format")

        # Return success response
        print(f"Successfully generated {len(flashcards)} flashcards")
        return jsonify({
            'success': True,
            'flashcards': flashcards,
            'count': len(flashcards)
        })

    except json.JSONDecodeError as e:
        # Handle JSON parsing errors
        print(f"JSON Parse Error: {e}")
        print(f"Raw response: {response_text}")
        return jsonify({
            'error': 'Failed to parse AI response. Please try again.',
            'details': str(e)
        }), 500
    
    except Exception as e:
        # Handle any other errors
        print(f"Error: {str(e)}")
        return jsonify({
            'error': 'An error occurred while generating flashcards.',
            'details': str(e)
        }), 500


# Run the Flask app
if __name__ == '__main__':
    # Get port from environment or use default 5000
    port = int(os.getenv('PORT', 5000))
    
    # Run server
    app.run(
        host='0.0.0.0',  # Makes server accessible from any IP
        port=port,
        debug=os.getenv('FLASK_DEBUG', 'True') == 'True'
    )