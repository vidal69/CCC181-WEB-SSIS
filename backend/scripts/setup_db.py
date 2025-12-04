"""
This Python script automates the complete setup and configuration of the application database using PostgreSQL. 
It performs a two-phase initialization process to ensure proper database structure and permissions.

Purpose
- Creates and configures a PostgreSQL database for the SSIS (Student Information System) web application
- Executes SQL scripts in the correct sequence to establish database schem
- Sets up necessary users, permissions, and table structures

Run with:
    python scripts/setup_db.py
    
This script should be run from the backend directory.
"""
import os
import subprocess
import psycopg2
import getpass
from dotenv import load_dotenv
from pathlib import Path
from werkzeug.security import generate_password_hash

load_dotenv()

db_user = os.getenv("DB_USERNAME", "postgres")
db_password = os.getenv("DB_PASSWORD", "")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "ssis_web")

env = os.environ.copy()
env["PGPASSWORD"] = db_password

base_dir = Path(__file__).parent.parent
setup_sql = base_dir / "scripts" / "setup.sql"
schema_sql = base_dir / "app" / "db" / "schema.sql"

# 1. System setup (run on default 'postgres' db)
subprocess.run([
    "psql",
    "-U", db_user,
    "-h", db_host,
    "-p", db_port,
    "-d", "postgres",
    "-f", str(setup_sql)
], env=env, check=True)

# 2. Schema setup (run on new database)
subprocess.run([
    "psql",
    "-U", db_user,
    "-h", db_host,
    "-p", db_port,
    "-d", db_name,
    "-f", str(schema_sql)
], env=env, check=True)

# 3. Create admin user using direct psycopg2 connection
print("\n" + "="*50)
print("ADMIN USER SETUP")
print("="*50)

try:
    # Database connection parameters
    db_params = {
        'host': db_host,
        'port': db_port,
        'database': db_name,
        'user': db_user,
        'password': db_password
    }
    
    # Connect to database
    conn = psycopg2.connect(**db_params)
    cur = conn.cursor()
    
    # Check if admin user already exists
    cur.execute("SELECT 1 FROM users WHERE username = 'admin'")
    if cur.fetchone():
        print("[✓] Admin user already exists")
    else:
        # Prompt for admin password
        print("\nPlease set a password for the default admin user:")
        print("Username: admin")
        print("Email: admin@gmail.com")
        print("Role: admin")
        print()
        
        password = getpass.getpass("Enter admin password: ")
        confirm_password = getpass.getpass("Confirm admin password: ")
        
        if password != confirm_password:
            print("❌ Passwords do not match. Using default password 'admin'.")
            password = "admin"
        
        # Generate proper password hash
        password_hash = generate_password_hash(password)
        
        # Insert admin user
        cur.execute(
            """
            INSERT INTO users (username, email, password_hash, role)
            VALUES (%s, %s, %s, %s)
            """,
            ("admin", "admin@gmail.com", password_hash, "admin")
        )
        
        conn.commit()
        print("\n[✓] Default admin user created successfully")
        print("    Username: admin")
        print("    Email: admin@gmail.com")
        print("    Role: admin")
        print("    Password: ********")  # Don't show the actual password
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"[!] Error creating admin user: {e}")

print("\n" + "="*50)
print("[✓] Database, user, and schema setup completed")
print("="*50)