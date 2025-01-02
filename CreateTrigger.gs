function createTriggers() {
  const triggers = ScriptApp.getProjectTriggers();

  // Xóa các trigger cũ
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });

  // Tạo trigger mới với khoảng thời gian 1 giờ
  ScriptApp.newTrigger('autoPostToFanpage')
    .timeBased()
    .everyHours(1) // Khoảng thời gian tối thiểu là 1 giờ
    .create();

  Logger.log('Triggers created successfully with 1-hour interval');
}
