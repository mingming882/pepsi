import os

# 读取原始HTML
with open(r'C:\Users\Lenovo\Desktop\新规喷码生成器Beta.html', 'r', encoding='utf-8') as f:
    original = f.read()

pwa_head = (
    '<!DOCTYPE html>\n'
    '<html lang="zh-CN">\n'
    '<head>\n'
    '  <meta charset="UTF-8">\n'
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n'
    '  <meta name="theme-color" content="#1a73e8">\n'
    '  <meta name="mobile-web-app-capable" content="yes">\n'
    '  <meta name="apple-mobile-web-app-capable" content="yes">\n'
    '  <meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
    '  <meta name="apple-mobile-web-app-title" content="喷码生成器">\n'
    '  <link rel="manifest" href="./manifest.json">\n'
    '  <link rel="apple-touch-icon" href="./icons/icon-192x192.png">\n'
    '  <title>新规喷码生成器</title>\n'
    '  <script>\n'
    '    if ("serviceWorker" in navigator) {\n'
    '      window.addEventListener("load", function() {\n'
    '        navigator.serviceWorker.register("./sw.js")\n'
    '          .then(reg => console.log("SW registered", reg.scope))\n'
    '          .catch(err => console.log("SW error", err));\n'
    '      });\n'
    '    }\n'
    '  </script>\n'
    '</head>\n'
    '<body>\n'
)

pwa_foot = '\n</body>\n</html>'

result = pwa_head + original + pwa_foot

out_path = r'C:\Users\Lenovo\Desktop\pwa_output\index.html'
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(result)

print('index.html 生成完成，大小:', len(result), 'bytes')
