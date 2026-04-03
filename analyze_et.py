import pandas as pd
import json

df = pd.read_excel('c:/AcadMix/sample_data/ET department(1).xlsx')

print("Columns:", df.columns.tolist())

# Try to find the section column or infer sections from the data
# Let's print unique values of columns that might represent sections
for col in df.columns:
    if 'section' in col.lower() or 'branch' in col.lower() or 'course' in col.lower():
        print(f"Unique {col}:", df[col].unique().tolist())

# Print first 2 rows for context
print("Head:")
print(df.head(2).to_dict(orient='records'))
