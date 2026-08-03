from PIL import Image

im = Image.open('src/assets/paper-ticket.png')
print('Image Mode:', im.mode)
print('Image Size:', im.size)

# Inspect top-left 10x10 pixels
width, height = im.size
pixels = im.load()
print('Top-Left 10x10 pixels:')
for y in range(10):
    row = []
    for x in range(10):
        pixel = pixels[x, y]
        row.append(pixel)
    print(f'Row {y}: {row}')

print('Bottom-Left 10x10 pixels:')
for y in range(height - 10, height):
    row = []
    for x in range(10):
        pixel = pixels[x, y]
        row.append(pixel)
    print(f'Row {y}: {row}')
