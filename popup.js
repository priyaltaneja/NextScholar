document.addEventListener('DOMContentLoaded', function() {
    // dom elements
    const scholarshipForm = document.getElementById('scholarship-form');
    const scholarshipList = document.getElementById('scholarship-list');
    const sortBy = document.getElementById('sort-by');
    const clearAllBtn = document.getElementById('clear-all');
    const addScholarshipBtn = document.getElementById('add-scholarship-btn');
    const formContainer = document.getElementById('form-container');
    const cancelBtn = document.getElementById('cancel-btn');
    
    // weekly goal
    const weeklyGoalForm = document.getElementById('weekly-goal-form');
    const weeklyGoalInput = document.getElementById('weekly-goal-input');
    const weeklyGoalProgress = document.getElementById('weekly-goal-progress');
    
    // tab switching
    const tabDueBtn = document.getElementById('tab-due');
    const tabAllBtn = document.getElementById('tab-all');
    const tabDueContent = document.getElementById('tab-due-content');
    const tabAllContent = document.getElementById('tab-all-content');
    
    // load saved scholarships
    loadScholarships();
    
    // event listeners
    if (scholarshipForm) {
        scholarshipForm.addEventListener('submit', addScholarship);
    }
    
    if (sortBy) {
        sortBy.addEventListener('change', loadScholarships);
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllScholarships);
    }
    
    if (addScholarshipBtn) {
        addScholarshipBtn.addEventListener('click', showForm);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideForm);
    }
    
    if (tabDueBtn && tabAllBtn && tabDueContent && tabAllContent) {
        tabDueBtn.addEventListener('click', function() {
            tabDueBtn.classList.add('active');
            tabAllBtn.classList.remove('active');
            tabDueContent.style.display = '';
            tabAllContent.style.display = 'none';
        });
        tabAllBtn.addEventListener('click', function() {
            tabAllBtn.classList.add('active');
            tabDueBtn.classList.remove('active');
            tabAllContent.style.display = '';
            tabDueContent.style.display = 'none';
        });
    }
    
    // add scholarship button for both tabs
    const addScholarshipBtnDue = document.getElementById('add-scholarship-btn-due');
    const addScholarshipBtnAll = document.getElementById('add-scholarship-btn-all');
    if (addScholarshipBtnDue) addScholarshipBtnDue.addEventListener('click', showForm);
    if (addScholarshipBtnAll) addScholarshipBtnAll.addEventListener('click', showForm);

    // sorting for due this week tab
    const sortByDue = document.getElementById('sort-by-due');
    if (sortByDue) sortByDue.addEventListener('change', loadScholarships);
    
    // function to show the form
    function showForm() {
        if (formContainer) {
            formContainer.style.display = 'block';
            if (scholarshipForm) {
                scholarshipForm.reset();
            }
            setTimeout(() => {
                formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    }
    
    // function to hide the form
    function hideForm() {
        if (formContainer) {
            formContainer.style.display = 'none';
            // clear the edit id when hiding the form
            if (scholarshipForm) {
                scholarshipForm.removeAttribute('data-edit-id');
            }
        }
    }
    
    // function to add a new scholarship
    function addScholarship(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const url = document.getElementById('url').value;
        const deadline = document.getElementById('deadline').value;
        const amount = document.getElementById('amount').value;
        const progress = document.getElementById('progress').value;
        const notes = document.getElementById('notes').value;
        const reminderDays = parseInt(document.getElementById('reminder').value);
        
        // check if we're editing an existing scholarship
        const editId = scholarshipForm.getAttribute('data-edit-id');
        
        // set deadline to 11:59 pm of the selected date
        const [year, month, day] = deadline.split('-').map(Number);
        const deadlineDate = new Date(year, month - 1, day, 23, 59, 0, 0);
        
        const scholarship = {
            id: editId || Date.now().toString(),
            name,
            url,
            deadline: deadlineDate.toISOString(),
            amount: amount ? parseFloat(amount) : 0,
            progress,
            notes,
            reminderDays,
            dateAdded: new Date().toISOString()
        };
        
        console.log('Adding/Updating scholarship:', scholarship);
        
        // save to storage
        chrome.storage.local.get(['scholarships'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error getting scholarships:', chrome.runtime.lastError);
                return;
            }
            
            let scholarships = result.scholarships || [];
            
            if (editId) {
                // if editing, replace the existing scholarship
                scholarships = scholarships.map(s => s.id === editId ? scholarship : s);
            } else {
                // if new, add to the list
                scholarships.push(scholarship);
            }
            
            console.log('Saving scholarships:', scholarships);
            
            chrome.storage.local.set({ scholarships: scholarships }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving scholarships:', chrome.runtime.lastError);
                    return;
                }
                
                console.log('Scholarships saved successfully');
                // clear the edit id
                scholarshipForm.removeAttribute('data-edit-id');
                // hide form
                hideForm();
                
                // reload list
                loadScholarships();
                
                // set reminder
                setReminder(scholarship);
                loadWeeklyGoal();
            });
        });
    }
    
    // render scholarships for both tabs
    function renderScholarships(scholarships, container) {
        container.innerHTML = '';
        if (scholarships.length === 0) {
            container.innerHTML = '<p>No scholarships found.</p>';
            return;
        }
        scholarships.forEach(scholarship => {
            const deadlineDate = new Date(scholarship.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // set to start of day for comparison
            const formattedDeadline = deadlineDate.toLocaleDateString();
            const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
            const scholarshipItem = document.createElement('div');
            scholarshipItem.className = 'scholarship-item';
            if (deadlineDate < today) {
                scholarshipItem.classList.add('expired');
            } else if (daysLeft <= 7) {
                scholarshipItem.classList.add('due-soon');
            }
            scholarshipItem.classList.add(`progress-${scholarship.progress}`);
            scholarshipItem.innerHTML = `
                <div class="scholarship-header">
                    <span class="scholarship-name">${scholarship.name}</span>
                    ${scholarship.amount ? `<span class="scholarship-amount">$${scholarship.amount.toLocaleString()}</span>` : ''}
                </div>
                <div class="scholarship-info">
                    <div class="scholarship-deadline">
                        Deadline: ${formattedDeadline} 
                        ${daysLeft > 0 ? `(${daysLeft} days left)` : '(Expired)'}
                    </div>
                    <div class="scholarship-progress">
                        <label for="progress-select-${scholarship.id}" style="font-weight:500;">Progress:</label>
                        <select class="progress-select" id="progress-select-${scholarship.id}" data-id="${scholarship.id}">
                            <option value="not-started" ${scholarship.progress === 'not-started' ? 'selected' : ''}>Not Started</option>
                            <option value="in-progress" ${scholarship.progress === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="completed" ${scholarship.progress === 'completed' ? 'selected' : ''}>Completed</option>
                        </select>
                    </div>
                </div>
                <a href="${scholarship.url}" class="scholarship-url" target="_blank">${scholarship.url}</a>
                ${scholarship.notes ? `<div class="scholarship-notes">${scholarship.notes}</div>` : ''}
                <div class="scholarship-actions">
                    <button class="btn-edit" data-id="${scholarship.id}">Edit</button>
                    <button class="btn-delete" data-id="${scholarship.id}">Delete</button>
                </div>
            `;
            container.appendChild(scholarshipItem);
        });
        // add event listeners for progress dropdowns, edit, and delete
        container.querySelectorAll('.progress-select').forEach(select => {
            select.addEventListener('change', function() {
                const scholarshipId = this.getAttribute('data-id');
                const newProgress = this.value;
                chrome.storage.local.get(['scholarships'], function(result) {
                    let scholarships = result.scholarships || [];
                    let updated = false;
                    let prevProgress = null;
                    scholarships = scholarships.map(s => {
                        if (s.id === scholarshipId) {
                            prevProgress = s.progress;
                            if (s.progress !== newProgress) {
                                updated = true;
                                return { ...s, progress: newProgress };
                            }
                        }
                        return s;
                    });
                    if (updated) {
                        chrome.storage.local.set({ scholarships }, function() {
                            loadScholarships();
                            setTimeout(loadWeeklyGoal, 100);
                            if (prevProgress !== 'completed' && newProgress === 'completed') {
                                incrementWeeklyCountIfNeeded({ progress: 'completed' }, prevProgress);
                            }
                        });
                    }
                });
            });
        });
        container.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', editScholarship);
        });
        container.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', deleteScholarship);
        });
    }

    // modified loadscholarships to use sorting for both tabs
    function loadScholarships() {
        chrome.storage.local.get(['scholarships'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading scholarships:', chrome.runtime.lastError);
                return;
            }
            const scholarships = result.scholarships || [];
            // all scholarships tab
            const sortValue = sortBy ? sortBy.value : 'deadline-asc';
            let sorted = scholarships.slice();
            sorted.sort((a, b) => {
                if (sortValue === 'deadline-asc') {
                    return new Date(a.deadline) - new Date(b.deadline);
                } else if (sortValue === 'deadline-desc') {
                    return new Date(b.deadline) - new Date(a.deadline);
                } else if (sortValue === 'amount-desc') {
                    return b.amount - a.amount;
                } else if (sortValue === 'amount-asc') {
                    return a.amount - b.amount;
                }
                return 0;
            });
            const allContainer = document.getElementById('scholarship-list-all');
            if (allContainer) renderScholarships(sorted, allContainer);
            // due this week tab
            const dueContainer = document.getElementById('scholarship-list-due');
            if (dueContainer) {
                const today = new Date();
                const weekEnd = new Date(today);
                weekEnd.setDate(today.getDate() + (7 - today.getDay()));
                const dueThisWeek = scholarships.filter(s => {
                    const deadline = new Date(s.deadline);
                    return deadline >= today && deadline <= weekEnd;
                });
                const sortValueDue = sortByDue ? sortByDue.value : 'deadline-asc';
                let sortedDue = dueThisWeek.slice();
                sortedDue.sort((a, b) => {
                    if (sortValueDue === 'deadline-asc') {
                        return new Date(a.deadline) - new Date(b.deadline);
                    } else if (sortValueDue === 'deadline-desc') {
                        return new Date(b.deadline) - new Date(a.deadline);
                    } else if (sortValueDue === 'amount-desc') {
                        return b.amount - a.amount;
                    } else if (sortValueDue === 'amount-asc') {
                        return a.amount - b.amount;
                    }
                    return 0;
                });
                renderScholarships(sortedDue, dueContainer);
            }
        });
    }
    
    // function to edit a scholarship
    function editScholarship() {
        const scholarshipId = this.getAttribute('data-id');
        
        chrome.storage.local.get(['scholarships'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error getting scholarships:', chrome.runtime.lastError);
                return;
            }
            
            const scholarships = result.scholarships || [];
            const scholarship = scholarships.find(s => s.id === scholarshipId);
            
            if (scholarship) {
                // show form
                showForm();
                
                // store the scholarship id in a data attribute on the form
                scholarshipForm.setAttribute('data-edit-id', scholarshipId);
                
                // fill the form with scholarship data
                document.getElementById('name').value = scholarship.name;
                document.getElementById('url').value = scholarship.url;
                document.getElementById('deadline').value = scholarship.deadline;
                document.getElementById('amount').value = scholarship.amount || '';
                document.getElementById('progress').value = scholarship.progress || 'not-started';
                document.getElementById('notes').value = scholarship.notes || '';
                document.getElementById('reminder').value = scholarship.reminderDays;
            }
        });
    }
    
    // function to delete a scholarship
    function deleteScholarship() {
        const scholarshipId = this.getAttribute('data-id');
        
        if (confirm('Are you sure you want to delete this scholarship?')) {
            chrome.storage.local.get(['scholarships'], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('Error getting scholarships:', chrome.runtime.lastError);
                    return;
                }
                
                const scholarships = result.scholarships || [];
                const updatedScholarships = scholarships.filter(s => s.id !== scholarshipId);
                
                chrome.storage.local.set({ scholarships: updatedScholarships }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error saving scholarships:', chrome.runtime.lastError);
                        return;
                    }
                    
                    // remove reminder alarm
                    chrome.alarms.clear(`scholarship-${scholarshipId}`);
                    // reload list
                    loadScholarships();
                });
            });
        }
    }
    
    // function to clear all scholarships
    function clearAllScholarships() {
        if (confirm('Are you sure you want to delete all scholarships?')) {
            chrome.storage.local.get(['scholarships'], function(result) {
                if (chrome.runtime.lastError) {
                    console.error('Error getting scholarships:', chrome.runtime.lastError);
                    return;
                }
                
                const scholarships = result.scholarships || [];
                
                // clear all alarms
                scholarships.forEach(scholarship => {
                    chrome.alarms.clear(`scholarship-${scholarship.id}`);
                });
                
                // clear storage
                chrome.storage.local.set({ scholarships: [] }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('Error clearing scholarships:', chrome.runtime.lastError);
                        return;
                    }
                    loadScholarships();
                });
            });
        }
    }
    
    // function to set reminder
    function setReminder(scholarship) {
        const deadlineDate = new Date(scholarship.deadline);
        const reminderDate = new Date(deadlineDate);
        reminderDate.setDate(deadlineDate.getDate() - scholarship.reminderDays);
        
        // only set reminder if it's in the future
        if (reminderDate > new Date()) {
            chrome.alarms.create(`scholarship-${scholarship.id}`, {
                when: reminderDate.getTime()
            });
        }
    }

    // helper: get start of current week (monday)
    function getWeekStartDate() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(now.setDate(diff));
        monday.setHours(0,0,0,0);
        return monday.toISOString().slice(0,10);
    }

    // load weekly goal from storage
    function loadWeeklyGoal() {
        chrome.storage.local.get(['weeklyGoal', 'weeklyCount', 'weeklyStart'], function(result) {
            let { weeklyGoal, weeklyCount, weeklyStart } = result;
            const currentWeekStart = getWeekStartDate();
            // reset count if week has changed
            if (weeklyStart !== currentWeekStart) {
                weeklyCount = 0;
                weeklyStart = currentWeekStart;
                chrome.storage.local.set({ weeklyCount, weeklyStart });
            }
            weeklyGoalInput.value = weeklyGoal || '';
            renderWeeklyGoalProgress(weeklyGoal, weeklyCount);
        });
    }

    // render weekly goal progress
    function renderWeeklyGoalProgress(goal, count) {
        if (!goal) {
            weeklyGoalProgress.innerHTML = '<span style="color:var(--gray-600)">Set a weekly goal to track your progress!</span>';
            return;
        }
        const percent = Math.min(100, Math.round((count/goal)*100));
        let bar = `<div class="weekly-goal-bar"><div class="weekly-goal-bar-inner" style="width:${percent}%;"></div></div>`;
        let msg = `<span>${count}/${goal} scholarships completed this week</span>`;
        if (count >= goal) {
            msg += ' <span style="color:var(--accent-light);font-weight:600;">🎉 Goal reached!</span>';
        }
        weeklyGoalProgress.innerHTML = msg + bar;
    }

    // set weekly goal
    if (weeklyGoalForm) {
        weeklyGoalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const goal = parseInt(weeklyGoalInput.value);
            if (goal > 0) {
                chrome.storage.local.set({ weeklyGoal: goal });
                loadWeeklyGoal();
            }
        });
    }

    // update weekly count when a scholarship is marked completed
    function incrementWeeklyCountIfNeeded(scholarship, prevProgress) {
        // only increment if progress changed to completed this week
        if (scholarship.progress === 'completed' && prevProgress !== 'completed') {
            const now = new Date();
            const weekStart = getWeekStartDate();
            chrome.storage.local.get(['weeklyCount', 'weeklyStart'], function(result) {
                let { weeklyCount, weeklyStart } = result;
                if (weeklyStart !== weekStart) {
                    weeklyCount = 0;
                    weeklyStart = weekStart;
                }
                weeklyCount = (weeklyCount || 0) + 1;
                chrome.storage.local.set({ weeklyCount, weeklyStart }, function() {
                    loadWeeklyGoal();
                });
            });
        }
    }

    // load weekly goal on popup open
    loadWeeklyGoal();

    // add event listener for manual weekly count reset
    const resetWeeklyBtn = document.getElementById('reset-weekly-count');
    if (resetWeeklyBtn) {
        resetWeeklyBtn.addEventListener('click', function() {
            chrome.storage.local.get(['weeklyStart'], function(result) {
                const weeklyStart = result.weeklyStart || getWeekStartDate();
                chrome.storage.local.set({ weeklyCount: 0, weeklyStart }, loadWeeklyGoal);
            });
        });
    }

    // download csv
    const downloadCsvBtn = document.getElementById('download-csv');
    if (downloadCsvBtn) {
        // helper to format date as mm/dd/yyyy
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d)) return dateStr;
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        };
        downloadCsvBtn.addEventListener('click', function() {
            chrome.storage.local.get(['scholarships'], function(result) {
                const scholarships = result.scholarships || [];
                if (scholarships.length === 0) {
                    alert('No scholarships to download.');
                    return;
                }
                // prepare csv header and rows
                const header = ['Name', 'URL', 'Deadline', 'Amount', 'Progress', 'Notes', 'ReminderDays', 'DateAdded'];
                const rows = scholarships.map(s => [
                    s.name,
                    s.url,
                    formatDate(s.deadline),
                    s.amount,
                    s.progress,
                    (s.notes || '').replace(/\n/g, ' '),
                    s.reminderDays,
                    s.dateAdded
                ]);
                // convert to csv string
                const csv = [header, ...rows].map(row => row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',')).join('\r\n');
                // download
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'scholarships.csv';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            });
        });
    }

    // google calendar sync
    const syncCalendarBtn = document.getElementById('sync-calendar');
    if (syncCalendarBtn) {
        syncCalendarBtn.addEventListener('click', async function() {
            try {
                const token = await new Promise((resolve, reject) => {
                    chrome.identity.getAuthToken({ 
                        interactive: true,
                        scopes: ['https://www.googleapis.com/auth/calendar.events']
                    }, function(token) {
                        if (chrome.runtime.lastError) {
                            console.error('Auth error:', chrome.runtime.lastError);
                            reject(new Error('Authorization failed: ' + chrome.runtime.lastError.message));
                            return;
                        }
                        if (!token) {
                            reject(new Error('No auth token received. Please check if you granted calendar permissions.'));
                            return;
                        }
                        resolve(token);
                    });
                });

                chrome.storage.local.get(['scholarships'], async function(result) {
                    const scholarships = result.scholarships || [];
                    if (scholarships.length === 0) {
                        alert('No scholarships to sync.');
                        return;
                    }

                    const toSync = scholarships.filter(s => s.deadline);
                    if (toSync.length === 0) {
                        alert('No scholarships with deadlines to sync.');
                        return;
                    }

                    let successCount = 0;
                    let failureCount = 0;

                    // show progress to user
                    alert(`Starting to sync ${toSync.length} scholarship deadlines...`);

                    const syncPromises = toSync.map(async (s) => {
                        try {
                            // parse the deadline and ensure it's set to 11:59 pm
                            const deadlineDate = new Date(s.deadline);
                            deadlineDate.setHours(23, 59, 0, 0);
                            
                            const eventSummary = `Scholarship Deadline: ${s.name}`;
                            const eventDescription = `Scholarship: ${s.name}\n${s.notes || ''}\n\nURL: ${s.url || ''}\n\n[NextScholar Event ID: ${s.id}]`;
                            const eventStart = deadlineDate.toISOString();
                            
                            // check for existing event with a wider time range (1 hour before and after)
                            const timeRangeStart = new Date(deadlineDate);
                            timeRangeStart.setHours(deadlineDate.getHours() - 1);
                            const timeRangeEnd = new Date(deadlineDate);
                            timeRangeEnd.setHours(deadlineDate.getHours() + 1);
                            
                            const listUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeRangeStart.toISOString())}&timeMax=${encodeURIComponent(timeRangeEnd.toISOString())}&q=${encodeURIComponent(s.name)}`;
                            const listResp = await fetch(listUrl, {
                                method: 'GET',
                                headers: {
                                    'Authorization': 'Bearer ' + token
                                }
                            });
                            
                            if (listResp.ok) {
                                const listData = await listResp.json();
                                // check for existing event by id in description or by title + time
                                const existingEvent = listData.items?.find(ev => {
                                    // check if it's a nextscholar event by id
                                    if (ev.description && ev.description.includes(`[NextScholar Event ID: ${s.id}]`)) {
                                        return true;
                                    }
                                    // check if it's a matching event by title and time
                                    if (ev.summary === eventSummary && 
                                        ev.start && 
                                        Math.abs(new Date(ev.start.dateTime).getTime() - deadlineDate.getTime()) < 3600000) { // within 1 hour
                                        return true;
                                    }
                                    return false;
                                });
                                
                                if (existingEvent) {
                                    // event already exists, skip
                                    return;
                                }
                            }
                            
                            // if not found, create event
                            const event = {
                                summary: eventSummary,
                                description: eventDescription,
                                start: { 
                                    dateTime: eventStart,
                                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                },
                                end: { 
                                    dateTime: eventStart,
                                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                                }
                            };
                            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                                method: 'POST',
                                headers: {
                                    'Authorization': 'Bearer ' + token,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(event)
                            });
                            if (!response.ok) {
                                const errorData = await response.json().catch(() => ({}));
                                console.error('Event creation failed:', errorData);
                                if (response.status === 401) {
                                    // token is invalid, remove it
                                    await new Promise((resolve) => {
                                        chrome.identity.removeCachedAuthToken({ token }, resolve);
                                    });
                                }
                                throw new Error(`Failed to create calendar event (${response.status})`);
                            }
                            const data = await response.json();
                            if (data.id) {
                                successCount++;
                            } else {
                                failureCount++;
                            }
                        } catch (err) {
                            console.error('Error syncing event:', err);
                            failureCount++;
                        }
                    });

                    // wait for all syncs to complete
                    await Promise.all(syncPromises);

                    // show final results
                    if (successCount > 0) {
                        alert(`Successfully synced ${successCount} scholarship deadlines to your Google Calendar!${failureCount > 0 ? `\n\nFailed to sync ${failureCount} deadlines.` : ''}`);
                    } else {
                        alert('Failed to sync any scholarship deadlines. Please check your calendar permissions and try again.');
                    }
                });
            } catch (error) {
                console.error('Sync error:', error);
                alert('Error syncing with Google Calendar: ' + error.message);
            }
        });
    }
});