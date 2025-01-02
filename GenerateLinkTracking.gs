/**
 * Hàm chính để tạo UTM Tracking links trong sheet Link Tracking
 */
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

  // Xóa nội dung cũ trong cột Link Result
  linkTrackingSheet.getRange(2, linkResultIndex + 1, linkTrackingData.length - 1, 1).clearContent();

  const updates = [];

  linkTrackingData.slice(1).forEach((row, rowIndex) => {
    const currentRow = rowIndex + 2;
    const linkInput = row[linkInputIndex];
    const fanpage = row[fanpageIndex];

    if (!linkInput || !fanpage) {
      updates.push(["Error: Missing Link Input or Fanpage"]); // Báo lỗi nếu thiếu dữ liệu
      return;
    }

    const dbRow = dbData.find(dbRow => dbRow[dbFanpageIndex] === fanpage);
    if (!dbRow) {
      updates.push(["Error: Fanpage not found in Database"]); // Báo lỗi nếu không tìm thấy Fanpage
      return;
    }

    const utmFanpage = dbRow[dbUtmFanpageIndex];
    const utmUser = dbRow[dbUtmUserIndex];

    const trackingLink = `${linkInput}?utm_source=${utmUser}&utm_medium=${utmFanpage}`;
    updates.push([trackingLink]); // Thêm link tracking đã tạo vào danh sách cập nhật
  });

  // Ghi toàn bộ dữ liệu vào cột Link Result
  linkTrackingSheet.getRange(2, linkResultIndex + 1, updates.length, 1).setValues(updates);
  console.log(`${logPrefix} Tracking links updated successfully.`);
}

/**
 * Hàm tự động kích hoạt khi người dùng chỉnh sửa Link Input
 */
function onEdit(e) {
  const sheetName = "Link Tracking";
  const editedSheet = e.source.getActiveSheet();

  if (editedSheet.getName() !== sheetName) return;

  const range = e.range;
  const headers = editedSheet.getDataRange().getValues()[0];
  const linkInputIndex = headers.indexOf("Link Input");
  const linkResultIndex = headers.indexOf("Link Result");

  // Kích hoạt hàm generateLinkTracking nếu cột Link Input thay đổi
  if (range.getColumn() - 1 === linkInputIndex) {
    generateLinkTracking();
  }
}
