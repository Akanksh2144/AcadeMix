import os
from pymongo import MongoClient
import certifi

url = "mongodb+srv://admin:MvzlSWXBk6Jef7O3@academix.qpb6nwe.mongodb.net/?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"
client = MongoClient(url, tlsCAFile=certifi.where())
db = client["AcadeMix"]

result = db.users.update_one(
    {"college_id": "HOD001"},
    {"$set": {"department": "DS, AIML, IT, CS", "college": "GNITC"}}
)
print("Matched:", result.matched_count, "Modified:", result.modified_count)

# Also check how HOD001 is stored currently
hod = db.users.find_one({"college_id": "HOD001"})
print(hod)
