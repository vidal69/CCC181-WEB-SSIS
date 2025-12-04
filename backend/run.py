from app import create_app
from app.db.bootstrap import bootstrap_schema_if_needed

app = create_app()

with app.app_context():
    bootstrap_schema_if_needed()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)