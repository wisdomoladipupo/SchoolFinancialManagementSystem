import json
from pathlib import Path

path = Path(__file__).with_name('data.json')
path.write_text(json.dumps({'students': [], 'payments': [], 'feeSettings': {}}, indent=2), encoding='utf-8')
print(path.read_text(encoding='utf-8'))
