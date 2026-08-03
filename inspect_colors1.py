from PIL import Image
from collections import Counter

im = Image.open('src/assets/paper-ticket1.png')
width, height = im.size
pixels = im.load()

colors = []
for y in range(30):
    for x in range(width):
        colors.append(pixels[x, y])

counter = Counter(colors)
print("paper-ticket1.png top 30 rows common colors:")
for c, count in counter.most_common(10):
    print(f"{c}: {count}")
