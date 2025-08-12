#!/usr/bin/env python3
from PIL import Image, ImageDraw
import os

# Create simple placeholder icons
icon_sizes = [(32, 32), (128, 128)]

for width, height in icon_sizes:
    # Create a new image with a transparent background
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a simple blue circle
    margin = 4
    draw.ellipse([margin, margin, width-margin, height-margin], 
                 fill=(70, 130, 180, 255), outline=(25, 25, 112, 255))
    
    # Save the image
    img.save(f'{width}x{height}.png')

# Copy 128x128 for the 2x version
img_128 = Image.open('128x128.png')
img_128.save('128x128@2x.png')

print("Created placeholder icons")