import os
from pymongo import MongoClient
import certifi

url = "mongodb+srv://admin:MvzlSWXBk6Jef7O3@acadmix.qpb6nwe.mongodb.net/?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"
client = MongoClient(url, tlsCAFile=certifi.where())
db = client["AcadMix"]

docs = db.users.find({"role": "student", "college": "GNITC"}).limit(5)
for doc in docs:
    print(f"Name: {doc.get('name')}, Dept: {doc.get('department')}, College: {doc.get('college')}, Section: {doc.get('section')}")
