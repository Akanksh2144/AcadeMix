with open('c:\\AcadMix\\backend\\models.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# delete lines 1185 to 1249 (0-indexed 1184 to 1248)
del lines[1184:1249]

with open('c:\\AcadMix\\backend\\models.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
