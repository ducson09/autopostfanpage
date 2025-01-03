function generateLinkTracking() {
  const linkTrackingSheetName = "Link Tracking";
  const dbSheetName = "Database";
  const logPrefix = "[Link Tracking]";

  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const linkTrackingSheet = sheet.getSheetByName(linkTrackingSheetName);
  const dbSheet = sheet.getSheetByName(dbSheetName);

  if (!linkTrackingSheet || !dbSheet) {
    console.log(`${logPrefix} Error: Missing required sheets.`);
    return;
  }

  const dbData = dbSheet.getDataRange().getValues();
  const dbHeaders = dbData[0];

  const dbFanpageIndex = dbHeaders.indexOf("Fanpage");
  const dbUtmFanpageIndex = dbHeaders.indexOf("UTM Fanpage");
  const dbUtmUserIndex = dbHeaders.indexOf("UTM User");

  if ([dbFanpageIndex, dbUtmFanpageIndex, dbUtmUserIndex].includes(-1)) {
    console.log(`${logPrefix} Error: Missing required columns in Database.`);
    return;
  }

  const range = linkTrackingSheet.getDataRange();
  const linkTrackingData = range.getValues();
  const headers = linkTrackingData[0];

  const linkInputIndex = headers.indexOf("Link Input");
  const fanpageIndex = headers.indexOf("Fanpage");
  const linkResultIndex = headers.indexOf("Link Result");

  if ([linkInputIndex, fanpageIndex, linkResultIndex].includes(-1)) {
    console.log(`${logPrefix} Error: Missing required columns in Link Tracking.`);
    return;
  }

  linkTrackingSheet.getRange(2, linkResultIndex + 1, linkTrackingData.length - 1, 1).clearContent();

  linkTrackingData.slice(1).forEach((row, rowIndex) => {
    const currentRow = rowIndex + 2;
    const linkInput = row[linkInputIndex];
    const fanpage = row[fanpageIndex];

    if (!linkInput || !fanpage) {
      console.log(`${logPrefix} Row ${currentRow}: Skipping as Link Input or Fanpage is missing.`);
      return;
    }

    const dbRow = dbData.find(dbRow => dbRow[dbFanpageIndex] === fanpage);
    if (!dbRow) {
      console.log(`${logPrefix} Row ${currentRow}: Fanpage not found in Database.`);
      linkTrackingSheet.getRange(currentRow, linkResultIndex + 1).setValue("Error: Fanpage not found in Database");
      return;
    }

    const utmFanpage = dbRow[dbUtmFanpageIndex];
    const utmUser = dbRow[dbUtmUserIndex];

    const trackingLink = `${linkInput}?utm_source=${utmUser}&utm_medium=${utmFanpage}`;
    linkTrackingSheet.getRange(currentRow, linkResultIndex + 1).setValue(trackingLink);
    console.log(`${logPrefix} Row ${currentRow}: Tracking link generated successfully.`);
  });
}

function onEdit(e) {
  const sheetName = "Link Tracking";
  const editedSheet = e.source.getActiveSheet();
  if (editedSheet.getName() !== sheetName) return;

  const range = e.range;
  const headers = editedSheet.getDataRange().getValues()[0];
  const linkInputIndex = headers.indexOf("Link Input");
  const linkResultIndex = headers.indexOf("Link Result");

  if (range.getColumn() - 1 === linkInputIndex) {
    generateLinkTracking();
  }
}
