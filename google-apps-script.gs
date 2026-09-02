const SHEET_NAME = "Prodotti";

/**
 * Google Apps Script per MARIOMODAGOLDSHOP.
 * 1) Apri il Google Sheet.
 * 2) Estensioni -> Apps Script.
 * 3) Incolla questo codice.
 * 4) Salva.
 * 5) Distribuisci -> Nuova distribuzione -> App web.
 *    Esegui come: Me
 *    Chi ha accesso: Chiunque
 * 6) Copia l'URL /exec nel file script.js.
 *
 * La colonna Foto può contenere un'immagine inserita "nella cella".
 */
function doGet() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sh) return json_({error:"Foglio Prodotti non trovato"});
  const values = sh.getDataRange().getValues();
  const headers = values.shift().map(String);
  const rows = values.map(row => {
    const obj = {};
    headers.forEach((h,i) => {
      const cell = sh.getRange(values.indexOf(row)+2, i+1);
      let value = row[i];

      // Recupera l'URL di un'immagine inserita direttamente nella cella.
      if (h.trim().toLowerCase() === "foto") {
        try {
          const cellValue = cell.getValue();
          if (cellValue && typeof cellValue.getContentUrl === "function") {
            value = cellValue.getContentUrl();
          }
        } catch (e) {}
      }
      obj[h] = value;
    });
    return obj;
  });
  return json_(rows);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
