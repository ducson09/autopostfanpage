function createTriggers() {
  const triggers = ScriptApp.getProjectTriggers();

  // Xóa các trigger cũ
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Tạo trigger cho autoPostToFanpage (chạy mỗi 15 phút)
  ScriptApp.newTrigger('autoPostToFanpage')
    .timeBased()
    .everyMinutes(15)
    .create();

  // Tạo trigger cho moveRowsToPublished (chạy mỗi 30 phút)
  ScriptApp.newTrigger('moveRowsToPublished')
    .timeBased()
    .everyMinutes(30)
    .create();

  // Tạo trigger cho moveRowsToStorage (chạy 1 ngày 1 lần lúc 1 giờ sáng)
  ScriptApp.newTrigger('moveRowsToStorage')
    .timeBased()
    .atHour(1) // 1 giờ sáng
    .everyDays(1)
    .create();

  // Tạo trigger cho getPostMetrics (chạy 1 ngày 1 lần lúc 7h15 sáng)
  ScriptApp.newTrigger('getPostMetrics')
    .timeBased()
    .atHour(7) // 7 giờ sáng
    .nearMinute(15) // 15 phút
    .everyDays(1)
    .create();

  Logger.log('Triggers created successfully');
}
