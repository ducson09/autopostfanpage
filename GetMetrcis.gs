function getPostMetrics() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const mainSheet = spreadsheet.getSheetByName('Main');
  const databaseSheet = spreadsheet.getSheetByName('Database');

  // Lấy dữ liệu từ trang tính Main
  const mainData = mainSheet.getRange(2, 1, mainSheet.getLastRow() - 1, 11).getValues(); // Dữ liệu từ cột Fanpage -> Click Link
  const postURLIndex = 7; // Cột G (Post URL) trong Main
  const reachIndex = 9; // Cột Reach (I)
  const reactionsIndex = 10; // Cột Reactions (J)
  const clickLinkIndex = 11; // Cột Click Link (K)

  // Lấy dữ liệu từ trang tính Database
  const databaseData = databaseSheet.getRange(2, 1, databaseSheet.getLastRow() - 1, 5).getValues(); // Fanpage ID -> Access Token
  const databaseMap = databaseData.reduce((map, row) => {
    const fanpage = row[1]?.trim(); // Cột Fanpage (index 2)
    map[fanpage] = {
      id: row[0],          // Fanpage ID (index 1)
      accessToken: row[4]  // Access Token (index 5)
    };
    return map;
  }, {});

  const apiVersion = 'v21.0';
  const metrics = ['post_impressions', 'post_reactions_by_type_total', 'post_clicks'];

  // Dùng mảng để lưu dữ liệu cập nhật cho từng dòng
  const updates = [];

  for (let i = 0; i < mainData.length; i++) {
    const row = mainData[i];
    const fanpageName = row[0]?.trim(); // Tên Fanpage từ cột A
    const postURL = row[postURLIndex - 1]; // Lấy Post URL từ cột G (index = 7)

    // Nếu Post URL chưa có dữ liệu, bỏ qua kiểm tra và không điền gì cả
    if (!postURL) {
      Logger.log(`Row ${i + 2}: Missing Post URL, skipping.`);
      updates.push([null, null, null]); // Không điền gì cả vào Reach, Reactions, Click Link
      continue;
    }

    if (!fanpageName) {
      Logger.log(`Row ${i + 2}: Missing Fanpage name`);
      updates.push(["-", "-", "-"]); // Điền "-" cho Reach, Reactions, Click Link
      continue;
    }

    const fanpageData = databaseMap[fanpageName];

    if (!fanpageData) {
      Logger.log(`Row ${i + 2}: Fanpage "${fanpageName}" not found in Database`);
      updates.push(["-", "-", "-"]); // Điền "-" cho Reach, Reactions, Click Link
      continue;
    }

    const postId = extractPostId(postURL);
    const accessToken = fanpageData.accessToken;

    if (!postId || !accessToken) {
      Logger.log(`Row ${i + 2}: Invalid Post ID or Access Token`);
      updates.push(["Error Token", "Error Token", "Error Token"]); // Ghi "Error Token"
      continue;
    }

    const url = `https://graph.facebook.com/${apiVersion}/${postId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`;

    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const json = JSON.parse(response.getContentText());

      if (json.error) {
        Logger.log(`Row ${i + 2}: Error for Post ID ${postId} - ${json.error.message}`);
        if (json.error.message.includes("Unsupported get request") || json.error.message.includes("does not exist")) {
          updates.push(["Post 404", "Post 404", "Post 404"]); // Ghi "Post 404"
        } else if (json.error.message.includes("access token")) {
          updates.push(["Error Token", "Error Token", "Error Token"]); // Ghi "Error Token"
        } else {
          updates.push(["-", "-", "-"]); // Ghi "-"
        }
        continue;
      }

      // Lấy giá trị Reach, Reactions, Click Link
      const impressions = json.data.find(metric => metric.name === 'post_impressions')?.values[0]?.value || "-";
      const reactionsData = json.data.find(metric => metric.name === 'post_reactions_by_type_total')?.values[0]?.value || {};
      const reactions = Object.keys(reactionsData).length > 0
        ? Object.values(reactionsData).reduce((total, num) => total + num, 0)
        : "-";
      const clicks = json.data.find(metric => metric.name === 'post_clicks')?.values[0]?.value || "-";

      updates.push([impressions, reactions, clicks]);
      Logger.log(`Row ${i + 2}: Post ID ${postId} - Reach: ${impressions}, Reactions: ${reactions}, Clicks: ${clicks}`);
    } catch (error) {
      Logger.log(`Row ${i + 2}: Error fetching data for Post ID ${postId} - ${error.message}`);
      updates.push(["-", "-", "-"]); // Ghi "-"
    }
  }

  // Ghi toàn bộ dữ liệu vào bảng tính cùng lúc
  mainSheet.getRange(2, reachIndex, updates.length, 3).setValues(updates);
}

function extractPostId(url) {
  const match = url.match(/\/(\d+)\/posts\/(\d+)/);
  return match ? `${match[1]}_${match[2]}` : null;
}
