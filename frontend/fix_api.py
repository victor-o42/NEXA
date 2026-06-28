import glob
import os

files = glob.glob('src/**/*.jsx', recursive=True) + glob.glob('src/**/*.js', recursive=True)
dynamic_api = "(window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click')"

count = 0
for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    c = content.replace("'http://localhost:8000", dynamic_api + " + '")
    c = c.replace('"http://localhost:8000', dynamic_api + ' + "')
    c = c.replace("`http://127.0.0.1:8000", "`${" + dynamic_api + "}")
    
    if c != content:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)
        count += 1
        print('Fixed:', path)

print('Total files fixed:', count)
