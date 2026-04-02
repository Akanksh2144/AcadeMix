import asyncio
import os
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "quizportal")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

LEETCODE_URL = "https://leetcode.com/graphql"

async def fetch_leetcode_questions(limit=50):
    print(f"Fetching top {limit} questions from LeetCode...")
    async with httpx.AsyncClient() as http:
        # Step 1: Get list of questions
        list_query = {
            "query": """
                query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
                  problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
                    total: totalNum
                    questions: data {
                      title
                      titleSlug
                      difficulty
                      topicTags { name }
                    }
                  }
                }
            """,
            "variables": {
                "categorySlug": "",
                "skip": 0,
                "limit": limit,
                "filters": {}
            }
        }
        
        res = await http.post(LEETCODE_URL, json=list_query, timeout=15.0)
        data = res.json()
        questions = data.get("data", {}).get("problemsetQuestionList", {}).get("questions", [])
        
        print(f"Found {len(questions)} questions. Fetching details for each...")
        
        # Step 2: Get details for each question
        inserted_count = 0
        for q in questions:
            slug = q["titleSlug"]
            detail_query = {
                "query": """
                    query questionData($titleSlug: String!) {
                      question(titleSlug: $titleSlug) {
                        content
                        exampleTestcaseList
                        codeSnippets {
                          langSlug
                          code
                        }
                      }
                    }
                """,
                "variables": {"titleSlug": slug}
            }
            try:
                det_res = await http.post(LEETCODE_URL, json=detail_query, timeout=10.0)
                det_data = det_res.json()
                question_detail = det_data.get("data", {}).get("question", {})
                
                # Extract python template
                python_template = ""
                snippets = question_detail.get("codeSnippets") or []
                for s in snippets:
                    if s["langSlug"] == "python":
                        python_template = s["code"]
                        break
                
                if not python_template:
                    continue # Skip if no Python support
                    
                doc = {
                    "title": q["title"],
                    "titleSlug": slug,
                    "difficulty": q["difficulty"],
                    "topics": [t["name"] for t in q.get("topicTags", [])],
                    "description": question_detail.get("content", "No description available."),
                    "test_cases": question_detail.get("exampleTestcaseList", []),
                    "language": "python",
                    "template_code": python_template,
                    "platform": "LeetCode"
                }
                
                # Upsert into MongoDB
                await db.coding_challenges.update_one(
                    {"titleSlug": slug, "platform": "LeetCode"},
                    {"$set": doc},
                    upsert=True
                )
                inserted_count += 1
                print(f"Added: {q['title']}")
                await asyncio.sleep(0.5) # rate limit prevention
            except Exception as e:
                print(f"Failed to fetch {slug}: {e}")
                
        print(f"Successfully processed {inserted_count} questions!")

async def main():
    await fetch_leetcode_questions(limit=50) # start with 50 for speed

if __name__ == "__main__":
    asyncio.run(main())
