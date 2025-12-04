#!/usr/bin/env python3
"""
Copy build artifacts produced by Vite from backend/dist -> backend/static (assets)
and backend/dist/index.html -> backend/templates/index.html

Run from frontend directory via:
    npm run build:flask
which calls: vite build && python ../backend/scripts/copy_dist.py
"""

import os
import shutil
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/
DIST_DIR = os.path.join(BASE_DIR, "dist")        # backend/dist (vite outDir)
STATIC_DIR = os.path.join(BASE_DIR, "static")    # backend/static
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")  # backend/templates

def ensure_dir(p):
    if not os.path.exists(p):
        os.makedirs(p, exist_ok=True)

def move_assets():
    assets_src = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_src):
        ensure_dir(STATIC_DIR)
        dest = os.path.join(STATIC_DIR, "assets")
        # remove old assets if present so we don't mix hashed files
        if os.path.exists(dest):
            print("Removing old static/assets...")
            shutil.rmtree(dest)
        print(f"Moving {assets_src} -> {dest}")
        shutil.move(assets_src, dest)
    else:
        print("No assets folder found in dist.")

def copy_index():
    index_src = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_src):
        ensure_dir(TEMPLATES_DIR)
        index_dest = os.path.join(TEMPLATES_DIR, "index.html")
        if os.path.exists(index_dest):
            print("Removing old templates/index.html...")
            os.remove(index_dest)
        print(f"Copying {index_src} -> {index_dest}")
        shutil.copy2(index_src, index_dest)
    else:
        print("No index.html found in dist.")

def move_other_files():
    # e.g. favicon or robots.txt. Put them to static root
    for name in os.listdir(DIST_DIR):
        src = os.path.join(DIST_DIR, name)
        if name == "assets" or name == "index.html":
            continue
        # move file to static root
        dest = os.path.join(STATIC_DIR, name)
        # if src is file
        if os.path.isfile(src):
            print(f"Copying {src} -> {dest}")
            ensure_dir(STATIC_DIR)
            shutil.copy2(src, dest)
        # if folder (rare)
        elif os.path.isdir(src):
            # skip assets which we already moved
            if os.path.exists(dest):
                shutil.rmtree(dest)
            shutil.move(src, dest)

def cleanup():
    if os.path.exists(DIST_DIR):
        try:
            print(f"Removing temporary dir {DIST_DIR}")
            shutil.rmtree(DIST_DIR)
        except Exception as e:
            print("Warning: could not remove dist dir:", e)

def main():
    if not os.path.exists(DIST_DIR):
        print("Error: dist folder not found. Run vite build first.")
        sys.exit(1)

    move_assets()
    move_other_files()
    copy_index()
    cleanup()
    print("✅ Build artifacts copied to backend (static + templates).")

if __name__ == "__main__":
    main()
