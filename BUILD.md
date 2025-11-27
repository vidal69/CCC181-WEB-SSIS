## Instructions
1. Create a database named ssis_web in postgres.
2. Create a .env file for the backend by copying `backend/.env.example`. Make sure to use your own database and supabase config.
3. Run setup_db.py from the backend directory.
4. Update supabase url in `frontend/src/pages/Students.tsx:72` into your own supabase url.
5. Run `pipenv install` in the backend. Type `npm install` in the frontend.
6. **IF you have made any changes**, run `npm run build` from the frontend directory.
7. Run `pipenv run python run.py` to run the app.