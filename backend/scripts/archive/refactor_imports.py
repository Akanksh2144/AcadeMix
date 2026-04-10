import os
import glob
import re

def main():
    py_files = glob.glob('**/*.py', recursive=True)
    # Exclude venv
    py_files = [f for f in py_files if 'venv' not in f and f != 'old_models.py' and f != 'split_models.py' and 'app\\models' not in f and 'app/models' not in f]

    for f in py_files:
        try:
            with open(f, 'r', encoding='utf-8') as file:
                content = file.read()
        except UnicodeDecodeError:
            print(f"Skipping {f} due to UnicodeDecodeError")
            continue
        
        original = content
        # Replace `import models` matching exactly, not as a substring of another word
        content = re.sub(r'^import models\b', 'from app import models', content, flags=re.MULTILINE)
        content = re.sub(r'^from models import\b', 'from app.models import', content, flags=re.MULTILINE)

        if content != original:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f"Updated {f}")

if __name__ == '__main__':
    main()
