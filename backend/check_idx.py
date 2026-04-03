from pymongo import MongoClient

client = MongoClient('mongodb://127.0.0.1:27017')
db = client['acadmix']
print("Users indexes:")
for idx in db.users.list_indexes():
    print(idx)
print("Student count:", db.users.count_documents({'role': 'student'}))
