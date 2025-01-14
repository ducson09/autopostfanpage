function getPostMetrics() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const publishedSheet = spreadsheet.getSheetByName('Published'); // Sheet Published
  const databaseSheet = spreadsheet.getSheetByName('Database'); // Sheet chứa Access Token

  if (!publishedSheet || !databaseSheet) {
    Logger.log('Error: Missing Published or Database sheet.');
    return;
  }

  // Lấy dữ liệu từ sheet Published
  const publishedData = publishedSheet.getRange(2, 1, publishedSheet.getLastRow() - 1, publishedSheet.getLastColumn()).getValues();
  const postURLIndex = 1; // Cột B (Post URL)
  const reachIndex = 3; // Cột D (Reach)
  const reactionsIndex = 4; // Cột E (Reactions)
  const clickLinkIndex = 5; // Cột F (Click Link)
  const fanpageIndex = 0; // Cột A (Fanpage)

  // Lấy dữ liệu từ sheet Database
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

  // Dùng mảng để lưu dữ liệu cập nhật
  const updates = [];

  for (let i = 0; i < publishedData.length; i++) {
    const row = publishedData[i];
    const fanpageName = row[fanpageIndex]?.trim(); // Tên Fanpage từ cột A
    const postURL = row[postURLIndex]?.trim(); // Lấy Post URL từ cột B

    // Kiểm tra Post URL
    if (!postURL) {
      Logger.log(`Row ${i + 2}: Missing Post URL, skipping.`);
      updates.push([null, null, null]); // Không điền gì vào Reach, Reactions, Click Link
      continue;
    }

    // Kiểm tra tên Fanpage
    if (!fanpageName) {
      Logger.log(`Row ${i + 2}: Missing Fanpage name.`);
      updates.push(["-", "-", "-"]); // Điền "-" cho các chỉ số
      continue;
    }

    // Đối chiếu Fanpage với Database
    const fanpageData = databaseMap[fanpageName];
    if (!fanpageData) {
      Logger.log(`Row ${i + 2}: Fanpage "${fanpageName}" not found in Database`);
      updates.push(["-", "-", "-"]);
      continue;
    }

    const postId = extractPostId(postURL);
    const accessToken = fanpageData.accessToken;

    // Kiểm tra Post ID và Access Token
    if (!postId || !accessToken) {
      Logger.log(`Row ${i + 2}: Invalid Post ID or Access Token`);
      updates.push(["Error Token", "Error Token", "Error Token"]);
      continue;
    }

    const url = `https://graph.facebook.com/${apiVersion}/${postId}/insights?metric=${metrics.join(',')}&access_token=${accessToken}`;

    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const json = JSON.parse(response.getContentText());

      // Xử lý lỗi từ API
      if (json.error) {
        Logger.log(`Row ${i + 2}: Error fetching metrics - ${json.error.message}`);
        if (json.error.message.includes("Object with ID") && json.error.message.includes("does not exist")) {
          updates.push(["Post 404", "Post 404", "Post 404"]); // Ghi "Post 404"
        } else {
          updates.push(["Error", "Error", "Error"]); // Ghi "Error" cho các lỗi khác
        }
        continue;
      }

      // Lấy các giá trị chỉ số
      const impressions = json.data.find(metric => metric.name === 'post_impressions')?.values[0]?.value || "-";
      const reactionsData = json.data.find(metric => metric.name === 'post_reactions_by_type_total')?.values[0]?.value || {};
      const reactions = Object.values(reactionsData).reduce((total, num) => total + num, 0) || "-";
      const clicks = json.data.find(metric => metric.name === 'post_clicks')?.values[0]?.value || "-";

      updates.push([impressions, reactions, clicks]);
      Logger.log(`Row ${i + 2}: Metrics fetched successfully - Reach: ${impressions}, Reactions: ${reactions}, Clicks: ${clicks}`);
    } catch (error) {
      Logger.log(`Row ${i + 2}: Error fetching data for Post ID ${postId} - ${error.message}`);
      updates.push(["-", "-", "-"]);
    }
  }

  // Ghi dữ liệu vào bảng Published
  if (updates.length > 0) {
    publishedSheet.getRange(2, reachIndex + 1, updates.length, 3).setValues(updates);
    Logger.log("Metrics updated successfully.");
  }

  // Gọi hàm highlightReach sau khi cập nhật dữ liệu
  highlightReach();
}

/**
 * Tô màu nền đỏ cho các ô Reach > 20000 và Publish Time không quá 7 ngày
 */
function highlightReach() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const publishedSheet = spreadsheet.getSheetByName('Published'); // Sheet Published

  if (!publishedSheet) {
    Logger.log('Error: Missing Published sheet.');
    return;
  }

  const dataRange = publishedSheet.getDataRange();
  const data = dataRange.getValues();
  const currentDate = new Date();

  const publishTimeIndex = 2; // Cột C (Publish Time)
  const reachIndex = 3; // Cột D (Reach)

  const backgroundColors = dataRange.getBackgrounds();

  for (let i = 1; i < data.length; i++) { // Bắt đầu từ hàng 2 (bỏ qua tiêu đề)
    const reachValue = parseInt(data[i][reachIndex], 10); // Lấy giá trị Reach
    const publishTime = new Date(data[i][publishTimeIndex]); // Lấy Publish Time

    if (!isNaN(reachValue) && reachValue > 20000) {
      const daysDifference = (currentDate - publishTime) / (1000 * 60 * 60 * 24); // Số ngày từ Publish Time

      if (daysDifference <= 7) { // Nếu Publish Time không quá 7 ngày
        backgroundColors[i][reachIndex] = "#FFCCCC"; // Tô màu đỏ nhạt cho ô Reach
      } else {
        backgroundColors[i][reachIndex] = null; // Xóa màu nếu không thỏa điều kiện
      }
    } else {
      backgroundColors[i][reachIndex] = null; // Xóa màu nếu không thỏa điều kiện
    }
  }

  // Cập nhật màu nền vào bảng Published
  dataRange.setBackgrounds(backgroundColors);
  Logger.log("Highlight completed successfully.");
}

/**
 * Trích xuất Post ID từ Post URL
 */
function extractPostId(url) {
  const match = url.match(/\/(\d+)\/posts\/(\d+)/);
  return match ? `${match[1]}_${match[2]}` : null;
}
