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

  Logger.log('Triggers created successfully');
}
