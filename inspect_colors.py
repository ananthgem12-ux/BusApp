from PIL import Image
from collections import Counter

im = Image.open('src/assets/paper-ticket.png')
width, height = im.size
pixels = im.load()

# Let's count colors in the top 30 rows
colors = []
for y in range(30):
    for x in range(width):
        colors.append(pixels[x, y])

counter = Counter(colors)
print("Top 30 rows most common colors:")
for c, count in counter.most_common(20):
    print(f"{c}: {count} ({count / (30 * width) * 100:.2f}%)")

# Let's also print most common colors in the middle rows (y=500 to 530)
mid_colors = []
for y in range(500, 530):
    for x in range(width):
        mid_colors.append(pixels[x, y])

mid_counter = Counter(mid_colors)
print("\nMiddle 30 rows most common colors:")
for c, count in mid_counter.most_common(20):
    print(f"{c}: {count} ({count / (30 * width) * 100:.2f}%)")
