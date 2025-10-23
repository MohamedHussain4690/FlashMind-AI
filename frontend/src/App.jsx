import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [numCards, setNumCards] = useState(5);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [flippedCards, setFlippedCards] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [inputMode, setInputMode] = useState('text');
  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setFlashcards([]);

    try {
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('num_cards', numCards);
      if (inputMode === 'text') {
        formData.append('content', content);
      } else {
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
      }

      const response = await axios.post('http://localhost:5000/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setFlashcards(response.data.flashcards);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate flashcards. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

const slugify = (s) =>
  (s || 'flashcards')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const getTxtFileName = (topic) => {
  const date = new Date().toISOString().slice(0, 10);
  return `${slugify(topic || 'flashcards')}-${date}.txt`;
};

const toTXT = (cards, topic) => {
  const header =
    `Flashcards - ${topic || 'Untitled Topic'}\r\n` +
    `Generated: ${new Date().toLocaleString()}\r\n\r\n`;
  const body = cards
    .map((c, i) => `Q${i + 1}: ${c.question}\r\nA${i + 1}: ${c.answer}`)
    .join(`\r\n\r\n---\r\n\r\n`);
  return header + body + `\r\n`;
};

const toggleFlip = (index) => {
  const card = document.querySelectorAll('.flashcard')[index];
  const inner = card?.querySelector('.flashcard-inner');
  if (!card || !inner) return;
  card.classList.add('is-flipping');
  setFlippedCards(prev => ({
    ...prev,
    [index]: !prev[index]
  }));
  const onEnd = (e) => {
    if (e.propertyName !== 'transform') return;
    card.classList.remove('is-flipping');
    card.classList.add('flip-feedback');
    setTimeout(() => card.classList.remove('flip-feedback'), 450);
  };
  inner.addEventListener('transitionend', onEnd, { once: true });
};

const handleFileChange = (e) => {
  const newFiles = Array.from(e.target.files);
  const combinedFiles = [...selectedFiles, ...newFiles];
  if (combinedFiles.length > 2) {
    setError('You can only upload a maximum of 2 files.');
    e.target.value = null;
    return;
  }
  const invalidFile = combinedFiles.find(file => {
    const ext = file.name.split('.').pop().toLowerCase();
    return !['pdf', 'doc', 'docx'].includes(ext);
  });

  if (invalidFile) {
    setError(`Invalid file type: "${invalidFile.name}". Only PDF and DOC/DOCX are allowed.`);
    e.target.value = null;
    return;
  }
  const oversizedFile = combinedFiles.find(file => file.size > 10 * 1024 * 1024);
  if (oversizedFile) {
    setError(`File is too large: "${oversizedFile.name}" exceeds 10MB.`);
    e.target.value = null;
    return;
  }
  setSelectedFiles(combinedFiles);
  setError('');
  e.target.value = null;
};

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  const downloadFlashcards = () => {
  if (!flashcards?.length) return;

  const text = toTXT(flashcards, topic);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = getTxtFileName(topic);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const btn = document.querySelector('.download-button');
  if (btn) {
    btn.classList.add('success');
    setTimeout(() => btn.classList.remove('success'), 900);
  }
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      
      {/* HEADER */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="logo-container">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-sm" />
            </div>
            <h1 className="header-title" data-text="AI Flashcard Generator">
                AI Flashcard Generator
            </h1>
          </div>
          <div className="header-tagline hidden md:block">
            Learn. Create. Master. ✨
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="container mx-auto px-4 py-8">
        
        {/* INPUT FORM */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8 border border-purple-500/20">
            {/* ========================================
    INTRODUCTION BOX - ADD THIS SECTION
======================================== */}
<div className="intro-box mb-8">
  <h3 className="intro-title">
    <span>🚀</span> Welcome to the AI Flashcard Generator!
  </h3>
  <p className="intro-text">
    Flashcards are powerful study tools with a question on one side and an answer on the other. They help you learn faster by actively testing your memory.
  </p>
  <ul className="tips-list">
    <li>
      <span>💡</span>
      <div>
        <strong>Be Specific:</strong> Use detailed topics or paste notes for better results. The more context the AI has, the better the flashcards.
      </div>
    </li>
    <li>
      <span>🔄</span>
      <div>
        <strong>Review Often:</strong> Use the downloaded TXT file to review your flashcards regularly. Spaced repetition is key to long-term memory.
      </div>
    </li>
    <li>
      <span>🧩</span>
      <div>
        <strong>Start Small:</strong> Begin with 3-5 cards per topic to focus on core concepts before expanding.
      </div>
    </li>
  </ul>
</div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="text-3xl mr-3">🎯</span>
              Generate Your Flashcards
            </h2>
            
            <form onSubmit={handleGenerate} className="space-y-6">
              
              {/* TOPIC INPUT */}
              <div>
                <label className="block text-purple-300 font-medium mb-2">
                  Topic / Subject <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Machine Learning, Python Basics, World History..."
                  className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* CONTENT/NOTES INPUT WITH FILE UPLOAD */}
              <div>
                <label className="block text-purple-300 font-medium mb-2">
                  Content / Notes (Optional)
                </label>
                
                {/* Toggle between Text and File input */}
                <div className="flex gap-4 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setSelectedFiles([]);
                      setError('');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inputMode === 'text'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    ✍️ Type Text
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('file');
                      setContent('');
                      setError('');
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      inputMode === 'file'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
                    }`}
                  >
                    📁 Upload Files
                  </button>
                </div>

                {/* Text Input Mode */}
                {inputMode === 'text' && (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste your study material, notes, or leave empty to generate from topic..."
                    rows="6"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                )}

                {/* File Upload Mode */}
                {inputMode === 'file' && (
                  <div className="space-y-3">
                    {/* File Input */}
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex items-center justify-center w-full px-4 py-8 bg-slate-700/50 border-2 border-dashed border-purple-500/30 rounded-lg cursor-pointer hover:border-purple-500/60 hover:bg-slate-700/70 transition-all"
                      >
                        <div className="text-center">
                          <div className="text-4xl mb-2">📎</div>
                          <span className="text-purple-300 font-medium block">
                            Click to upload PDF or DOC files
                          </span>
                          <span className="text-gray-400 text-sm mt-1 block">
                            Maximum 2 files • Up to 10MB each
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Selected Files Display */}
                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-purple-300 font-medium text-sm">
                          Selected Files ({selectedFiles.length}/2):
                        </p>
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-slate-700/50 px-4 py-3 rounded-lg border border-purple-500/20"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-3xl">
                                {file.name.endsWith('.pdf') ? '📄' : '📝'}
                              </span>
                              <div>
                                <p className="text-white font-medium">{file.name}</p>
                                <p className="text-gray-400 text-sm">
                                  {(file.size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-400 hover:text-red-300 font-bold text-xl px-2 py-1 hover:bg-red-500/10 rounded transition-colors"
                              title="Remove file"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* File Upload Info */}
                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
                      <p className="text-purple-200 text-sm">
                        <span className="font-semibold">💡 Tip:</span> Upload your study materials (PDFs, Word docs) and AI will extract the content to generate flashcards!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* NUMBER SLIDER */}
              <div>
                <label className="block text-purple-300 font-medium mb-2">
                  Number of Flashcards: <span className="text-white font-bold">{numCards}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={numCards}
                  onChange={(e) => setNumCards(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between mt-2">
  <span className="slider-number">3</span>
  <span className="slider-number">10</span>
</div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-slate-800 disabled:shadow-inner text-white font-bold py-4 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="spinner mr-3"></div>
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="text-2xl mr-2">✨</span>
                    Generate Flashcards
                  </span>
                )}
              </button>
            </form>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="mt-6 bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                <div className="font-bold">⚠️ Error:</div>
                <div className="mt-2">{error}</div>
                <div className="mt-2 text-sm opacity-75">
                  Check backend terminal for detailed error logs.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FLASHCARDS DISPLAY */}
        {flashcards.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <span className="text-3xl mr-3">🎴</span>
                Your Flashcards ({flashcards.length})
              </h2>
              <button onClick={downloadFlashcards} className="download-button">
  <span className="download-icon">⬇️</span>
  <span>Download TXT</span>
</button>
            </div>

            {/* FLASHCARDS GRID */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {flashcards.map((card, index) => (
    <div
      key={index}
      className={`flashcard ${flippedCards[index] ? 'flipped' : ''}`}
      onClick={() => toggleFlip(index)}
    >
      <div className="flashcard-inner">
        
        {/* FRONT OF CARD */}
        <div className="flashcard-front">
          <div>
            <div>Question {index + 1}</div>
            <div className="scroll-container">
  <p>{card.question}</p>
</div>
            <div>💡 Click to Flip</div>
          </div>
        </div>
        
        {/* BACK OF CARD */}
        <div className="flashcard-back">
          <div>
            <div>Answer</div>
            <div className="scroll-container">
  <p>{card.answer}</p>
</div>
            <div>🔄 Click to Flip Back</div>
          </div>
        </div>
        
      </div>
    </div>
  ))}
</div>

            <p className="text-center text-purple-300 mt-8 text-lg">
              💡 Click any card to see the answer!
            </p>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900/50 backdrop-blur-sm border-t border-purple-500/20 mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-purple-300">
          <p>Made with ❤️ by Mohamed Hussain N</p>
        </div>
      </footer>

    </div>
  );
}
export default App;