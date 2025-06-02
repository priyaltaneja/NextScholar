// set up context menu for right-click on links
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "saveScholarship",
      title: "Save as Scholarship",
      contexts: ["link"]
    });
  });
  
  // handle context menu click
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "saveScholarship") {
      // open popup with pre-filled url
      chrome.action.openPopup();
      
      // send message to popup to fill form
      chrome.runtime.sendMessage({
        action: "fillScholarshipForm",
        url: info.linkUrl
      });
    }
  });
  
  // listen for alarm triggers
  chrome.alarms.onAlarm.addListener((alarm) => {
    // check if it's a scholarship alarm
    if (alarm.name.startsWith('scholarship-')) {
      const scholarshipId = alarm.name.replace('scholarship-', '');
      
      // get scholarship details
      chrome.storage.local.get('scholarships', function(data) {
        const scholarships = data.scholarships || [];
        const scholarship = scholarships.find(s => s.id === scholarshipId);
        
        if (scholarship) {
          // create notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Scholarship Deadline Reminder',
            message: `${scholarship.name} is due in ${scholarship.reminderDays} days (${new Date(scholarship.deadline).toLocaleDateString()})`,
            buttons: [
              { title: 'View Scholarship' }
            ],
            priority: 2
          });
        }
      });
    }
  });
  
  // handle notification button click
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
      // get scholarship id from notification id
      const scholarshipId = notificationId.replace('scholarship-reminder-', '');
      
      // get scholarship details
      chrome.storage.local.get('scholarships', function(data) {
        const scholarships = data.scholarships || [];
        const scholarship = scholarships.find(s => s.id === scholarshipId);
        
        if (scholarship) {
          // open scholarship url
          chrome.tabs.create({ url: scholarship.url });
        }
      });
    }
  });
  
  // listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "checkUrlData") {
      // respond with any stored data for the url
      sendResponse({ success: true });
      return true;
    }
  });