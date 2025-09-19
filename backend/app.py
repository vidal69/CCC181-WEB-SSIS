from flask import Flask, jsonify, render_template_string
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allows requests from your frontend

# Simple HTML template
HTML_PAGE = """
<!DOCTYPE html>
<html>
<head>
    <title>Flask UI</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; }
        h1 { color: #2c3e50; }
        p { font-size: 18px; }
    </style>
</head>
<body>
    <h1>🚀 Flask Backend is Running!</h1>
    <p>{{ message }}</p>
</body>
</html>
"""

@app.route("/", methods=["GET"])
def hello():
    return render_template_string(HTML_PAGE, message="Hello from Flask!")

@app.route("/api/message", methods=["GET"])
def api_message():
    return jsonify(message="Hello from Flask API!")

if __name__ == "__main__":
    app.run(debug=True, port=5000)  # backend runs on port 5000
