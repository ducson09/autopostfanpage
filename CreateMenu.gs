/**
 * Tạo menu tùy chỉnh trong Google Sheets
 * Menu sẽ xuất hiện trong Google Sheet khi người dùng mở file
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Fanpage Tools') // Tên menu xuất hiện trên thanh công cụ
    .addItem('Run AutoPost', 'autoPostToFanpage') // Tên chức năng và hàm tương ứng
    .addItem('Get Metrics', 'getPostMetrics') // Tên chức năng và hàm tương ứng
    .addSeparator() // Thêm đường phân cách
    .addItem('Create Triggers', 'createTriggers') // Thêm chức năng tạo trigger
    .addToUi(); // Thêm menu vào giao diện
}

/**
 * Tạo menu tùy chỉnh khi script được cài đặt
 * Hàm này chạy khi Add-on được cài đặt vào Google Sheet
 */
function onInstall(e) {
  onOpen(e); // Gọi lại hàm onOpen để tạo menu
}
