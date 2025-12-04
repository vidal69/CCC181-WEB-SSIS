CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'admin'
);

CREATE TABLE IF NOT EXISTS colleges (
    college_code VARCHAR(20) PRIMARY KEY,
    college_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS programs (
    program_code VARCHAR(20) PRIMARY KEY,
    program_name VARCHAR(100) NOT NULL,
    college_code VARCHAR(20) REFERENCES colleges(college_code) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
    id_number VARCHAR(9) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    year_level INT CHECK (year_level BETWEEN 1 AND 5),
    gender VARCHAR(10) CHECK (gender IN ('MALE','FEMALE','OTHER')),
    program_code VARCHAR(20) REFERENCES programs(program_code) ON DELETE SET NULL ON UPDATE CASCADE,
    photo_path TEXT;
);
  