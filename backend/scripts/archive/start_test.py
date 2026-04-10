import asyncio
import sys
import traceback

def main():
    try:
        from app.main import app
        print("SUCCESSFULLY LOADED APP")
    except Exception as e:
        print("FAILED TO LOAD APP")
        traceback.print_exc()

if __name__ == "__main__":
    main()
