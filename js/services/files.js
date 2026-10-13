// Entrada y salida de archivos locales: leer reportes (.xlsx / .csv), elegir un archivo y descargar.
(() => {
  const PYL = globalThis.PYL;
  const services = (PYL.services ??= {});
  const { cellVal, parseCSV } = PYL.core.parse;

  const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  // Filas de la primera hoja (xlsx) o del CSV, como arreglos de valores planos.
  async function readRows(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith('.xls')) throw new Error('Formato .xls antiguo no soportado. Exporta como .xlsx o .csv.');
    if (name.endsWith('.xlsx')) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      const out = [];
      ws.eachRow({ includeEmpty: false }, (row) => {
        const arr = [];
        for (let c = 1; c <= ws.columnCount; c++) arr.push(cellVal(row.getCell(c)));
        out.push(arr);
      });
      return out;
    }
    // CSV: UTF-8 por defecto; si aparecen caracteres inválidos, el archivo venía en Windows-1252.
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
    return parseCSV(text);
  }

  // Selector de archivo clásico, para navegadores sin File System Access API.
  function pickXlsx() {
    return new Promise((res) => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = '.xlsx';
      i.onchange = () => res(i.files[0] || null); i.click();
    });
  }

  function download(buf, name) {
    const url = URL.createObjectURL(new Blob([buf], { type: XLSX_MIME }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  services.files = { readRows, pickXlsx, download, XLSX_MIME };
})();
