import os
from pymongo import MongoClient
import certifi

url = "mongodb+srv://admin:MvzlSWXBk6Jef7O3@academix.qpb6nwe.mongodb.net/?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"
client = MongoClient(url, tlsCAFile=certifi.where())
db = client["AcadeMix"]

pipeline = [
    {"$match": {"role": "student", "college": "GNITC"}},
    {"$group": {"_id": "$department", "count": {"$sum": 1}}}
]
results = db.users.aggregate(pipeline)
for r in results:
    print(r)
