function autoPostToFanpage() {
  const mainSheetName = "Main";
  const dbSheetName = "Database";
  const logPrefix = "[Fanpage Post Automation]";

  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = sheet.getSheetByName(mainSheetName);
  const dbSheet = sheet.getSheetByName(dbSheetName);

  if (!mainSheet || !dbSheet) {
    console.log(`${logPrefix} Error: Missing required sheets.`);
    return;
  }

  const mainData = mainSheet.getDataRange().getValues();
  const dbData = dbSheet.getDataRange().getValues();

  const headers = mainData[0];
  const dbHeaders = dbData[0];

  const fanpageIndex = 0;
  const photoUrlIndex = 1;
  const captionIndex = 2;
  const linkCommentIndex = 3;
  const statusIndex = 4;
  const scheduledTimeIndex = 5;
  const postUrlIndex = 6;
  const publishTimeIndex = 7;

  const dbFanpageIndex = dbHeaders.indexOf("Fanpage");
  const dbFanpageIdIndex = dbHeaders.indexOf("Fanpage ID");
  const dbAccessTokenIndex = dbHeaders.indexOf("Access Token");
  const dbUtmFanpageIndex = dbHeaders.indexOf("UTM Fanpage");
  const dbUtmUserIndex = dbHeaders.indexOf("UTM User");

  if ([dbFanpageIndex, dbFanpageIdIndex, dbAccessTokenIndex, dbUtmFanpageIndex, dbUtmUserIndex].includes(-1)) {
    console.log(`${logPrefix} Error: Missing required columns in Database sheet.`);
    return;
  }

  const now = new Date();

  mainData.slice(1).forEach((row, rowIndex) => {
    const currentRow = rowIndex + 2;

    if (row[postUrlIndex] || !row[fanpageIndex]) {
      console.log(`${logPrefix} Row ${currentRow}: Skipping as Post URL is already set or Fanpage is empty.`);
      return;
    }

    const status = row[statusIndex];
    const fanpage = row[fanpageIndex];
    const photoUrl = row[photoUrlIndex];
    const caption = row[captionIndex];
    const linkComment = row[linkCommentIndex];
    const scheduledTimeRaw = row[scheduledTimeIndex];
    const scheduledTime = new Date(scheduledTimeRaw);

    if (status === "Pending") {
      const errors = [];
      if (!photoUrl || !/^https?:\/\/.*\.(jpg|jpeg|png)$/i.test(photoUrl)) {
        errors.push("Invalid Photo URL");
      }
      if (!caption) {
        errors.push("Caption missing");
      }
      if (!linkComment) {
        errors.push("Link Comment missing");
      }

      if (errors.length > 0) {
        console.log(`${logPrefix} Row ${currentRow}: ${errors.join(", ")}`);
        mainSheet.getRange(currentRow, statusIndex + 1).setValue(`Error: ${errors.join(", ")}`);
        return;
      }

      mainSheet.getRange(currentRow, statusIndex + 1).setValue("Ready");
      console.log(`${logPrefix} Row ${currentRow}: Marked as Ready.`);
    }

    if (status === "Ready" && scheduledTime <= now) {
      const dbRow = dbData.find(dbRow => dbRow[dbFanpageIndex] === fanpage);
      if (!dbRow) {
        console.log(`${logPrefix} Row ${currentRow}: Fanpage not found in Database.`);
        mainSheet.getRange(currentRow, statusIndex + 1).setValue("Error: Fanpage not found in Database");
        return;
      }

      const fanpageId = dbRow[dbFanpageIdIndex];
      const accessToken = dbRow[dbAccessTokenIndex];
      const utmFanpage = dbRow[dbUtmFanpageIndex];
      const utmUser = dbRow[dbUtmUserIndex];

      try {
        // Bước 1: Upload ảnh
        const uploadResponse = UrlFetchApp.fetch(`https://graph.facebook.com/v21.0/${fanpageId}/photos`, {
          method: "post",
          payload: {
            url: photoUrl,
            published: false,
            access_token: accessToken,
          },
          muteHttpExceptions: true,
        });
        const uploadResult = JSON.parse(uploadResponse.getContentText());
        console.log(`${logPrefix} Row ${currentRow}: Photo Upload Response:`, uploadResult);

        if (uploadResult.error) throw new Error(`Photo Upload Error: ${uploadResult.error.message}`);
        const mediaFbid = uploadResult.id;

        // Bước 2: Tạo bài viết
        const postResponse = UrlFetchApp.fetch(`https://graph.facebook.com/v21.0/${fanpageId}/feed`, {
          method: "post",
          payload: {
            message: `${caption}\n👇👇 Read more in comments`,
            attached_media: JSON.stringify([{ media_fbid: mediaFbid }]),
            access_token: accessToken,
          },
          muteHttpExceptions: true,
        });
        const postResult = JSON.parse(postResponse.getContentText());
        console.log(`${logPrefix} Row ${currentRow}: Post Response:`, postResult);

        if (postResult.error) throw new Error(`Post Error: ${postResult.error.message}`);

        // Cập nhật URL bài viết
        const postUrl = `https://www.facebook.com/${fanpageId}/posts/${postResult.id.split('_')[1]}`;
        const publishTime = formatDateTime(new Date());
        mainSheet.getRange(currentRow, postUrlIndex + 1).setValue(postUrl);
        mainSheet.getRange(currentRow, publishTimeIndex + 1).setValue(publishTime);
        mainSheet.getRange(currentRow, statusIndex + 1).setValue("Done");

        console.log(`${logPrefix} Row ${currentRow}: Post created successfully.`);

        // Bước 3: Thêm bình luận với UTM Tracking
        const trackingLink = `${linkComment}?utm_source=${utmUser}&utm_medium=${utmFanpage}`;
        const commentMessage = `${caption} =>> ${trackingLink}`;

        const commentResponse = UrlFetchApp.fetch(`https://graph.facebook.com/v21.0/${postResult.id}/comments`, {
          method: "post",
          payload: {
            message: commentMessage,
            access_token: accessToken,
          },
          muteHttpExceptions: true,
        });

        const commentResult = JSON.parse(commentResponse.getContentText());
        console.log(`${logPrefix} Row ${currentRow}: Comment Response:`, commentResult);

        if (commentResult.error) throw new Error(`Comment Error: ${commentResult.error.message}`);
        console.log(`${logPrefix} Row ${currentRow}: Comment added successfully.`);

      } catch (e) {
        console.log(`${logPrefix} Row ${currentRow}: ${e.message}`);
        mainSheet.getRange(currentRow, statusIndex + 1).setValue(`Error: ${e.message}`);
      }
    }
  });
}

function formatDateTime(dateTime) {
  const year = dateTime.getFullYear();
  const month = String(dateTime.getMonth() + 1).padStart(2, '0');
  const day = String(dateTime.getDate()).padStart(2, '0');
  const hours = String(dateTime.getHours()).padStart(2, '0');
  const minutes = String(dateTime.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
