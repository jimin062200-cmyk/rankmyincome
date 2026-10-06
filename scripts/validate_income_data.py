#!/usr/bin/env python3
import json, math, sys
from pathlib import Path

path = Path(sys.argv[1] if len(sys.argv) > 1 else 'data/income-data.json')
data = json.loads(path.read_text(encoding='utf-8'))
errors=[]

def validate_thresholds(label, rows):
    if not isinstance(rows,list) or len(rows)<2:
        errors.append(f'{label}: fewer than 2 thresholds'); return
    last_p=-1; last_v=-math.inf
    for row in rows:
        if not isinstance(row,list) or len(row)!=2:
            errors.append(f'{label}: invalid row {row!r}'); continue
        p,v=row
        if not (isinstance(p,(int,float)) and isinstance(v,(int,float))):
            errors.append(f'{label}: non-numeric row {row!r}'); continue
        if p < last_p: errors.append(f'{label}: percentile order decreases at {row!r}')
        if v < last_v: errors.append(f'{label}: threshold decreases at {row!r}')
        if not 0 <= p < 100: errors.append(f'{label}: percentile outside [0,100): {p}')
        if v <= 0: errors.append(f'{label}: non-positive threshold {v}')
        last_p,last_v=p,v

validate_thresholds('world',data.get('world',{}).get('thresholds'))
for code,c in data.get('countries',{}).items():
    validate_thresholds(code,c.get('thresholds'))
    ppp=c.get('pppPerWorldUnit')
    if not isinstance(ppp,(int,float)) or ppp<=0: errors.append(f'{code}: invalid PPP conversion')
    if not c.get('name'): errors.append(f'{code}: missing name')
    if not c.get('currency'): errors.append(f'{code}: missing currency')

if errors:
    print('INVALID')
    for e in errors: print('-',e)
    sys.exit(1)
print(f"OK: {len(data.get('countries',{}))} countries, status={data.get('meta',{}).get('status')}, source={data.get('meta',{}).get('source')}")
