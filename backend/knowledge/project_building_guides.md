# Pathfinder Project Blueprints & Building Guides

## 1. AIML / Data Science
### Project 1: Smart Resume ATS Analyzer (Medium)
- **Goal**: Build an NLP model that parses resumes and checks match percentage against job descriptions.
- **Tools**: Python, Spacy, Scikit-learn, Streamlit.
- **Step 1**: Parse PDF/DOCX resumes into raw text using PyPDF2.
  - *How to check*: Print extracted text in terminal and verify no blank output.
- **Step 2**: Clean text (remove stopwords, punctuation) and extract key skills using SpaCy NER.
  - *How to check*: Output extracted skill tags array.
- **Step 3**: Calculate TF-IDF Vector Cosine Similarity score against Job Description.
  - *How to check*: Score must range between 0% and 100%.
- **Step 4**: Build Streamlit dashboard for real-time file upload and visual breakdown.
  - *How to check*: Upload sample resume and see score gauge update.

## 2. CSE / IT / Web Development
### Project 1: Real-time Collaborative Code Editor (Hard)
- **Goal**: Web-based IDE with real-time multi-user editing and syntax highlighting.
- **Tools**: Node.js, Express, Socket.io, Monaco Editor, React.
- **Step 1**: Initialize Node.js backend with Socket.io server on port 5000.
  - *How to check*: Test websocket connection using Postman or browser console.
- **Step 2**: Integrate Monaco Editor into React frontend and capture `onChange` events.
  - *How to check*: Code typing updates local state smoothly without lag.
- **Step 3**: Emit code operational transformation (OT) events via Socket.io to connected room users.
  - *How to check*: Open two browser tabs; typing in tab 1 mirrors instantly in tab 2.
- **Step 4**: Integrate Docker container service to execute Python/JS code securely on backend.
  - *How to check*: Output of `print("Hello Pathfinder")` renders in output console.

## 3. ECE / Embedded / IoT
### Project 1: IoT Smart Energy Metering System (Small)
- **Goal**: Monitor real-time voltage/current consumption and upload data to dashboard.
- **Tools**: ESP32, ACS712 Sensor, MQTT Protocol, Node-RED / ThingSpeak.
