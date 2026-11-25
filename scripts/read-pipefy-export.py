"""Read-only XLSX extraction; no workbook is authored or modified."""
import json, sys, zipfile, xml.etree.ElementTree as ET
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
    shared=[]
    if 'xl/sharedStrings.xml' in z.namelist():
        shared=[''.join(x.itertext()) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',ns)]
    sheet=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows=[]
    for r in sheet.findall('.//s:sheetData/s:row',ns):
        row=[]
        for c in r.findall('s:c',ns):
            col=0
            for ch in ''.join(x for x in c.attrib['r'] if x.isalpha()): col=col*26+ord(ch)-64
            while len(row)<col: row.append('')
            value=c.find('s:v',ns)
            text=value.text if value is not None else ''
            if c.attrib.get('t')=='s': text=shared[int(text)] if text else ''
            elif c.attrib.get('t')=='inlineStr': text=''.join(c.find('s:is',ns).itertext())
            row[col-1]=text
        rows.append(row)
    json.dump(rows,sys.stdout,ensure_ascii=False)
