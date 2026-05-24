// script.js
document.addEventListener('DOMContentLoaded', () => {
    
    // Helper function to robustly parse date string as local date
    function parseLocalDateTime(dateStr) {
        if (!dateStr) return new Date();
        if (dateStr instanceof Date) return dateStr;
        if (!isNaN(dateStr)) return new Date(Number(dateStr));

        // Format is typically "YYYY-MM-DDTHH:mm" or "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm:ss"
        const parts = String(dateStr).split(/[T ]/);
        if (parts.length >= 1) {
            const datePart = parts[0];
            const timePart = parts[1] || "00:00";
            
            const dateSplit = datePart.split('-');
            if (dateSplit.length === 3) {
                const [year, month, day] = dateSplit.map(Number);
                const timeSplit = timePart.split(':');
                const hours = Number(timeSplit[0] || 0);
                const minutes = Number(timeSplit[1] || 0);
                const seconds = Number(timeSplit[2] ? timeSplit[2].split('.')[0] : 0);
                
                return new Date(year, month - 1, day, hours, minutes, seconds, 0);
            }
        }
        return new Date(dateStr);
    }

    // Helper function to format Date object (or timestamp) to local ISO "YYYY-MM-DDTHH:mm"
    function toLocalISOString(date) {
        const d = parseLocalDateTime(date);
        const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
        return localISOTime;
    }

    // 1. Core Data & Initialization
    const defaultEvents = [
        { id: 'evt-1', name: 'Product Launch 🚀', date: '2026-06-15T10:00', originalDate: '2026-06-15T10:00', icon: '🚀', isPaused: false, remainingMs: 0, createdAt: Date.now() - 86400000 * 5 },
        { id: 'evt-2', name: 'Birthday Bash 🎂', date: '2026-08-20T18:00', originalDate: '2026-08-20T18:00', icon: '🎂', isPaused: false, remainingMs: 0, createdAt: Date.now() },
        { id: 'evt-3', name: 'Dream Vacation ✈️', date: '2026-12-01T08:00', originalDate: '2026-12-01T08:00', icon: '✈️', isPaused: false, remainingMs: 0, createdAt: Date.now() },
        { id: 'evt-4', name: 'New Year 2026 🎉', date: '2027-01-01T00:00', originalDate: '2027-01-01T00:00', icon: '🎉', isPaused: false, remainingMs: 0, createdAt: Date.now() }
    ];

    let events = JSON.parse(localStorage.getItem('evently_events_v3')) || defaultEvents;
    let activeEventId = localStorage.getItem('evently_active_event_v3') || events[0].id;
    let activeEvent = events.find(e => e.id === activeEventId) || events[0];
    
    let timerInterval = null;

    // App Preferences
    let prefs = JSON.parse(localStorage.getItem('evently_prefs')) || {
        theme: 'light',
        sound: true,
        notifications: true,
        autoSave: true
    };

    // Sanitize events to ensure they all have originalDate and createdAt
    let eventsModified = false;
    events.forEach(evt => {
        if (!evt.originalDate) {
            evt.originalDate = evt.date;
            eventsModified = true;
        }
        if (!evt.createdAt) {
            evt.createdAt = parseLocalDateTime(evt.originalDate).getTime() - 2592000000; // Default to 30 days ago
            eventsModified = true;
        }
    });
    if (eventsModified && prefs.autoSave) {
        localStorage.setItem('evently_events_v3', JSON.stringify(events));
    }
    
    let notifs = JSON.parse(localStorage.getItem('evently_notifs')) || [
        { id: 'n1', text: 'Product Launch in 2 days', time: Date.now() - 3600000, read: false, eventId: 'evt-1' },
        { id: 'n2', text: 'Birthday tomorrow', time: Date.now() - 86400000, read: false, eventId: 'evt-2' },
        { id: 'n3', text: 'Welcome to Evently!', time: Date.now() - 172800000, read: true, eventId: null }
    ];

    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // 2. DOM Elements
    const els = {
        html: document.documentElement,
        eventSelector: document.getElementById('eventSelector'),
        customDate: document.getElementById('customDate'),
        customTime: document.getElementById('customTime'),
        
        daysVal: document.getElementById('daysVal'),
        hoursVal: document.getElementById('hoursVal'),
        minutesVal: document.getElementById('minutesVal'),
        secondsVal: document.getElementById('secondsVal'),
        
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        circularProgress: document.getElementById('circularProgress'),
        circlePercentage: document.getElementById('circlePercentage'),
        circleProgressText: document.getElementById('circleProgressText'),
        
        pauseBtn: document.getElementById('pauseBtn'),
        resumeBtn: document.getElementById('resumeBtn'),
        resetBtn: document.getElementById('resetBtn'),
        
        eventsGrid: document.getElementById('eventsGrid'),
        liveCard: document.getElementById('liveCard'),
        replaySoundBtn: document.getElementById('replaySoundBtn'),
        
        themeToggle: document.getElementById('themeToggle'),
        hamburger: document.getElementById('hamburger'),
        sidebar: document.getElementById('sidebar'),
        mobileOverlay: document.getElementById('mobileOverlay'),
        
        // Notifications
        bellBtn: document.getElementById('bellBtn'),
        notifBadge: document.getElementById('notifBadge'),
        notifDropdown: document.getElementById('notifDropdown'),
        notifList: document.getElementById('notifList'),
        markReadBtn: document.getElementById('markReadBtn'),
        clearNotifBtn: document.getElementById('clearNotifBtn'),
        emptyNotif: document.getElementById('emptyNotif'),
        notifOverlay: document.getElementById('notifOverlay'),

        // Profile
        profileBtn: document.getElementById('profileBtn'),
        profileDropdown: document.getElementById('profileDropdown'),
        
        toast: document.getElementById('toast'),
        toastMsg: document.getElementById('toastMsg'),
        toastIcon: document.getElementById('toastIcon'),
        
        // Modals / Drawers
        sidebarEventsBtn: document.getElementById('sidebarEventsBtn'),
        sidebarAddEventBtn: document.getElementById('sidebarAddEventBtn'),
        sidebarSettingsBtn: document.getElementById('sidebarSettingsBtn'),
        sidebarAboutBtn: document.getElementById('sidebarAboutBtn'),
        bottomAddEventBtn: document.getElementById('bottomAddEventBtn'),
        
        addEventModal: document.getElementById('addEventModal'),
        modalContent: document.getElementById('modalContent'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        saveNewEventBtn: document.getElementById('saveNewEventBtn'),
        newEventName: document.getElementById('newEventName'),
        newEventDate: document.getElementById('newEventDate'),
        newEventTime: document.getElementById('newEventTime'),
        
        settingsOverlay: document.getElementById('settingsOverlay'),
        settingsDrawer: document.getElementById('settingsDrawer'),
        closeSettingsBtn: document.getElementById('closeSettingsBtn'),
        resetDataBtn: document.getElementById('resetDataBtn'),
        
        aboutModal: document.getElementById('aboutModal'),
        aboutContent: document.getElementById('aboutContent'),
        closeAboutBtn: document.getElementById('closeAboutBtn'),

        resetModal: document.getElementById('resetModal'),
        resetContent: document.getElementById('resetContent'),
        closeResetBtn: document.getElementById('closeResetBtn'),
        cancelResetBtn: document.getElementById('cancelResetBtn'),
        confirmResetBtn: document.getElementById('confirmResetBtn'),

        // Drawer Toggles
        drawerThemeToggle: document.getElementById('drawerThemeToggle'),
        drawerSoundToggle: document.getElementById('drawerSoundToggle'),
        drawerNotifToggle: document.getElementById('drawerNotifToggle'),
        drawerAutoSaveToggle: document.getElementById('drawerAutoSaveToggle'),
    };

    // 3. UI Helpers & Theme
    function applyTheme() {
        if (prefs.theme === 'dark' || (!prefs.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            els.html.classList.add('dark');
            updateToggleState(els.drawerThemeToggle, true);
        } else {
            els.html.classList.remove('dark');
            updateToggleState(els.drawerThemeToggle, false);
        }
    }
    applyTheme();

    function toggleTheme() {
        prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        savePrefs();
        showToast(`Theme changed to ${prefs.theme}`, "success");
    }
    els.themeToggle.addEventListener('click', toggleTheme);

    function toggleMobileMenu() {
        els.sidebar.classList.toggle('-translate-x-full');
        els.mobileOverlay.classList.toggle('hidden');
    }
    els.hamburger.addEventListener('click', toggleMobileMenu);
    els.mobileOverlay.addEventListener('click', toggleMobileMenu);

    // Toast System
    let toastTimeout;
    function showToast(msg, type = 'info') {
        if(!prefs.notifications && type !== 'error') return; // Hide info toasts if notifications disabled
        
        els.toastMsg.textContent = msg;
        els.toast.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-apple-hover flex items-center gap-3 transition-all duration-300 z-[100] text-white`;
        
        if (type === 'error') {
            els.toast.classList.add('bg-red-500');
            els.toastIcon.className = "ph-fill ph-warning-circle text-xl";
        } else if (type === 'success') {
            els.toast.classList.add('bg-green-500');
            els.toastIcon.className = "ph-fill ph-check-circle text-xl";
        } else {
            els.toast.classList.add('bg-gray-900', 'dark:bg-white', 'dark:text-gray-900');
            els.toastIcon.className = "ph-fill ph-info text-xl";
        }

        els.toast.classList.remove('translate-y-20', 'opacity-0');
        
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            els.toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }

    // 4. Render Engine
    function renderSelector() {
        els.eventSelector.innerHTML = '';
        events.forEach(evt => {
            const opt = document.createElement('option');
            opt.value = evt.id;
            opt.textContent = evt.name;
            if(evt.id === activeEvent.id) opt.selected = true;
            els.eventSelector.appendChild(opt);
        });
    }

    function renderGrid() {
        els.eventsGrid.innerHTML = '';
        events.forEach(evt => {
            const isSelected = evt.id === activeEvent.id;
            const card = document.createElement('div');
            card.id = `card-${evt.id}`;
            card.className = `bg-white dark:bg-cardDark border ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-borderLight dark:border-gray-800'} rounded-xl p-4 shadow-apple card-hover cursor-pointer transition-all flex items-center gap-4 relative group`;
            card.tabIndex = 0; // Accessible
            
            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = "absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white/80 dark:bg-cardDark/80 rounded-md backdrop-blur-sm z-10 focus:outline-none focus:ring-2 focus:ring-red-500";
            delBtn.innerHTML = '<i class="ph-bold ph-trash"></i>';
            delBtn.title = "Delete Event";
            
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteEvent(evt.id);
            };

            const content = document.createElement('div');
            content.className = "flex items-center gap-4 w-full";
            content.innerHTML = `
                <div class="w-12 h-12 rounded-xl bg-bgMain dark:bg-gray-800 flex items-center justify-center text-2xl shrink-0 shadow-sm border border-gray-100 dark:border-gray-700">
                    ${evt.icon || '📅'}
                </div>
                <div class="flex-1 min-w-0 pr-6">
                    <h5 class="font-bold text-textMain dark:text-white truncate text-sm">${evt.name}</h5>
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 truncate">${parseLocalDateTime(evt.date).toLocaleDateString()}</p>
                </div>
            `;
            
            card.appendChild(delBtn);
            card.appendChild(content);

            card.addEventListener('click', () => switchEvent(evt));
            card.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') switchEvent(evt);
            });
            
            els.eventsGrid.appendChild(card);
        });
    }

    function updateInputs() {
        if(activeEvent && activeEvent.date) {
            els.customDate.value = activeEvent.date.slice(0,10);
            els.customTime.value = activeEvent.date.slice(11,16);
        }
    }

    function switchEvent(evt) {
        if(!evt) return;
        activeEvent = evt;
        activeEventId = evt.id;
        saveData();
        renderSelector();
        renderGrid();
        updateInputs();
        startTimer();
    }

    // 5. Input Handlers
    els.eventSelector.addEventListener('change', (e) => {
        const evt = events.find(ev => ev.id === e.target.value);
        switchEvent(evt);
    });

    function handleInputUpdate() {
        const d = els.customDate.value;
        const t = els.customTime.value;
        if(d && t) {
            let newDate = parseLocalDateTime(`${d}T${t}`);
            const now = Date.now();
            if(newDate.getTime() <= now) {
                if (now - newDate.getTime() < 60000) {
                    newDate = new Date(now + 60000); // 1 minute from now
                } else {
                    showToast("Please select a future date", "error");
                    updateInputs();
                    return;
                }
            }
            activeEvent.date = toLocalISOString(newDate);
            activeEvent.originalDate = activeEvent.date;
            activeEvent.createdAt = Date.now();
            activeEvent.isPaused = false;
            activeEvent.soundPlayed = false;
            saveData();
            renderGrid();
            updateInputs(); // Update input fields to show any 1-minute adjustment
            startTimer();
            showToast("Event updated successfully", "success");
        }
    }

    els.customDate.addEventListener('change', handleInputUpdate);
    els.customTime.addEventListener('change', handleInputUpdate);

    function saveData() {
        if(prefs.autoSave) {
            localStorage.setItem('evently_events_v3', JSON.stringify(events));
            localStorage.setItem('evently_active_event_v3', activeEventId);
        }
    }
    
    function savePrefs() {
        localStorage.setItem('evently_prefs', JSON.stringify(prefs));
    }
    
    function saveNotifs() {
        localStorage.setItem('evently_notifs', JSON.stringify(notifs));
    }

    // Add Notification helper
    function pushNotification(text, eventId = null) {
        if(!prefs.notifications) return;
        const newNotif = {
            id: 'n' + Date.now(),
            text,
            time: Date.now(),
            read: false,
            eventId
        };
        notifs.unshift(newNotif);
        saveNotifs();
        renderNotifications();
    }

    // 6. Add/Delete Events
    function deleteEvent(id) {
        if(events.length <= 1) {
            showToast("Cannot delete the last event", "error");
            return;
        }
        events = events.filter(e => e.id !== id);
        if(activeEventId === id) {
            switchEvent(events[0]);
        } else {
            saveData();
            renderSelector();
            renderGrid();
        }
        showToast("Event deleted", "success");
        pushNotification("Event was deleted.");
    }

    // Generic Modal Handler
    function openModal(overlay, content) {
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            if(content.classList.contains('translate-x-full')) {
                content.classList.remove('translate-x-full');
            } else {
                content.classList.remove('scale-95');
                content.classList.add('scale-100');
            }
        }, 10);
    }

    function closeModal(overlay, content) {
        overlay.classList.add('opacity-0');
        if(content.classList.contains('translate-x-full') === false && content.classList.contains('transform')) {
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
        }
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }

    // Click Outside Handling for Modals & Drawers
    els.addEventModal.addEventListener('click', (e) => {
        if(e.target === els.addEventModal) closeModal(els.addEventModal, els.modalContent);
    });
    
    els.aboutModal.addEventListener('click', (e) => {
        if(e.target === els.aboutModal) closeModal(els.aboutModal, els.aboutContent);
    });

    els.resetModal.addEventListener('click', (e) => {
        if(e.target === els.resetModal) closeModal(els.resetModal, els.resetContent);
    });
    
    els.settingsOverlay.addEventListener('click', () => {
        closeSettings();
    });

    // Add Event Modal
    function openAddEvent() {
        openModal(els.addEventModal, els.modalContent);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        els.newEventName.value = '';
        const localISO = toLocalISOString(tomorrow);
        els.newEventDate.value = localISO.slice(0, 10);
        els.newEventTime.value = localISO.slice(11, 16);
        els.newEventName.focus();
    }
    
    els.sidebarAddEventBtn.addEventListener('click', () => {
        openAddEvent();
        if(window.innerWidth < 768) toggleMobileMenu();
    });
    els.bottomAddEventBtn.addEventListener('click', openAddEvent);
    els.closeModalBtn.addEventListener('click', () => closeModal(els.addEventModal, els.modalContent));

    els.saveNewEventBtn.addEventListener('click', () => {
        const name = els.newEventName.value.trim();
        const d = els.newEventDate.value;
        const t = els.newEventTime.value;
        
        if(!name || !d || !t) {
            showToast("Please fill all fields", "error");
            return;
        }
        
        const dtStr = `${d}T${t}`;
        let targetTime = parseLocalDateTime(dtStr);
        const now = Date.now();
        if(targetTime.getTime() <= now) {
            if (now - targetTime.getTime() < 60000) {
                targetTime = new Date(now + 60000); // 1 minute from now
            } else {
                showToast("Please select a future date", "error");
                return;
            }
        }
        
        const newEvt = {
            id: 'evt-' + Date.now(),
            name: name,
            date: toLocalISOString(targetTime),
            originalDate: toLocalISOString(targetTime),
            icon: '📅',
            isPaused: false,
            soundPlayed: false,
            remainingMs: 0,
            createdAt: Date.now()
        };
        
        events.push(newEvt);
        closeModal(els.addEventModal, els.modalContent);
        switchEvent(newEvt);
        showToast("Event added successfully!", "success");
        pushNotification(`New event added: ${name}`, newEvt.id);
    });

    // About Modal
    els.sidebarAboutBtn.addEventListener('click', () => {
        openModal(els.aboutModal, els.aboutContent);
        if(window.innerWidth < 768) toggleMobileMenu();
    });
    els.closeAboutBtn.addEventListener('click', () => closeModal(els.aboutModal, els.aboutContent));

    // Settings Drawer
    function updateToggleState(btn, state) {
        const circle = btn.querySelector('div');
        if(state) {
            btn.classList.add('bg-primary');
            btn.classList.remove('bg-gray-200', 'dark:bg-gray-600');
            circle.classList.add('translate-x-6');
        } else {
            btn.classList.remove('bg-primary');
            btn.classList.add('bg-gray-200', 'dark:bg-gray-600');
            circle.classList.remove('translate-x-6');
        }
    }

    function initSettings() {
        updateToggleState(els.drawerThemeToggle, prefs.theme === 'dark');
        updateToggleState(els.drawerSoundToggle, prefs.sound);
        updateToggleState(els.drawerNotifToggle, prefs.notifications);
        updateToggleState(els.drawerAutoSaveToggle, prefs.autoSave);
    }

    function openSettings() {
        els.settingsOverlay.classList.remove('hidden');
        setTimeout(() => els.settingsOverlay.classList.remove('opacity-0'), 10);
        els.settingsDrawer.classList.add('active');
    }

    function closeSettings() {
        els.settingsOverlay.classList.add('opacity-0');
        els.settingsDrawer.classList.remove('active');
        setTimeout(() => els.settingsOverlay.classList.add('hidden'), 300);
    }

    els.sidebarSettingsBtn.addEventListener('click', () => {
        initSettings();
        openSettings();
        if(window.innerWidth < 768) toggleMobileMenu();
    });
    els.closeSettingsBtn.addEventListener('click', () => closeSettings());

    els.drawerThemeToggle.addEventListener('click', () => { toggleTheme(); updateToggleState(els.drawerThemeToggle, prefs.theme === 'dark'); });
    els.drawerSoundToggle.addEventListener('click', () => { prefs.sound = !prefs.sound; savePrefs(); updateToggleState(els.drawerSoundToggle, prefs.sound); showToast(prefs.sound ? "Sound enabled" : "Sound disabled"); });
    els.drawerNotifToggle.addEventListener('click', () => { prefs.notifications = !prefs.notifications; savePrefs(); updateToggleState(els.drawerNotifToggle, prefs.notifications); showToast("Notification preferences saved"); });
    els.drawerAutoSaveToggle.addEventListener('click', () => { prefs.autoSave = !prefs.autoSave; savePrefs(); updateToggleState(els.drawerAutoSaveToggle, prefs.autoSave); showToast("Auto-save toggled"); });

    els.resetDataBtn.addEventListener('click', () => {
        if(confirm("Are you sure you want to reset all events and settings? This cannot be undone.")) {
            localStorage.clear();
            window.location.reload();
        }
    });

    // 7. Dropdowns (Notifications & Profile)
    let dropdownTimeouts = {};
    
    function closeDropdown(d) {
        d.classList.add('opacity-0', '-translate-y-2');
        d.classList.remove('opacity-100', 'translate-y-0');
        
        if (d.id === 'notifDropdown' && window.innerWidth < 768) {
            els.notifOverlay.classList.add('opacity-0');
            setTimeout(() => {
                els.notifOverlay.classList.add('hidden');
            }, 300);
        }
        
        dropdownTimeouts[d.id] = setTimeout(() => d.classList.add('hidden'), 200);
    }
    
    function openDropdown(d) {
        if(dropdownTimeouts[d.id]) clearTimeout(dropdownTimeouts[d.id]);
        d.classList.remove('hidden');
        
        if (d.id === 'notifDropdown' && window.innerWidth < 768) {
            els.notifOverlay.classList.remove('hidden');
            // small delay to allow display:block to apply before animating opacity
            setTimeout(() => {
                els.notifOverlay.classList.remove('opacity-0');
            }, 10);
        }
        
        setTimeout(() => {
            d.classList.remove('opacity-0', '-translate-y-2');
            d.classList.add('opacity-100', 'translate-y-0');
        }, 10);
    }
    
    function closeAllDropdowns() {
        [els.notifDropdown, els.profileDropdown].forEach(d => {
            if (!d.classList.contains('hidden')) {
                closeDropdown(d);
            }
        });
    }

    function toggleDropdown(d) {
        const isHidden = d.classList.contains('hidden');
        [els.notifDropdown, els.profileDropdown].forEach(other => {
            if (other !== d && !other.classList.contains('hidden')) {
                closeDropdown(other);
            }
        });
        
        if (isHidden) {
            openDropdown(d);
        } else {
            closeDropdown(d);
        }
    }

    els.profileBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(els.profileDropdown); });
    els.bellBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(els.notifDropdown); });
    
    els.notifDropdown.addEventListener('click', (e) => e.stopPropagation());
    els.profileDropdown.addEventListener('click', (e) => e.stopPropagation());
    
    els.notifOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllDropdowns();
    });
    
    document.addEventListener('click', closeAllDropdowns);

    // Escape Key handling
    document.addEventListener('keydown', (e) => {
        if(e.key === 'Escape') {
            closeAllDropdowns();
            closeModal(els.addEventModal, els.modalContent);
            closeSettings();
            closeModal(els.aboutModal, els.aboutContent);
            closeModal(els.resetModal, els.resetContent);
        }
    });
    
    // Notifications Logic
    function timeAgo(ms) {
        const seconds = Math.floor((Date.now() - ms) / 1000);
        if(seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if(minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if(hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours/24)}d ago`;
    }

    function renderNotifications() {
        const unreadCount = notifs.filter(n => !n.read).length;
        if(unreadCount > 0) {
            els.notifBadge.classList.remove('hidden');
        } else {
            els.notifBadge.classList.add('hidden');
        }

        els.notifList.innerHTML = '';
        if(notifs.length === 0) {
            els.emptyNotif.classList.remove('hidden');
        } else {
            els.emptyNotif.classList.add('hidden');
            notifs.forEach(n => {
                const item = document.createElement('div');
                item.className = `p-4 border-b border-borderLight dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors flex items-start gap-3 ${!n.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`;
                item.innerHTML = `
                    <div class="w-8 h-8 rounded-full bg-indigo-50 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <i class="ph-fill ph-bell-ringing text-primary"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-sm text-textMain dark:text-white ${!n.read ? 'font-semibold' : 'font-medium'}">${n.text}</p>
                        <p class="text-xs text-gray-500 mt-1">${timeAgo(n.time)}</p>
                    </div>
                    ${!n.read ? '<div class="w-2 h-2 rounded-full bg-primary mt-2"></div>' : ''}
                `;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    n.read = true;
                    saveNotifs();
                    renderNotifications();
                    closeAllDropdowns();
                    
                    if(n.eventId) {
                        const evt = events.find(ev => ev.id === n.eventId);
                        if(evt) {
                            switchEvent(evt);
                            // Scroll to event section
                            document.getElementById('mainContent').scrollTo({ top: document.getElementById('eventsSection').offsetTop - 20, behavior: 'smooth' });
                            
                            // Highlight card
                            setTimeout(() => {
                                const card = document.getElementById(`card-${n.eventId}`);
                                if (card) {
                                    card.classList.add('ring-4', 'ring-primary', 'scale-105');
                                    setTimeout(() => {
                                        card.classList.remove('ring-4', 'ring-primary', 'scale-105');
                                    }, 1500);
                                }
                            }, 100);
                        }
                    }
                });
                els.notifList.appendChild(item);
            });
        }
    }
    
    els.markReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifs.forEach(n => n.read = true);
        saveNotifs();
        renderNotifications();
    });
    
    els.clearNotifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifs = [];
        saveNotifs();
        renderNotifications();
    });

    renderNotifications();

    // 8. Alarm Feature (Premium Success Chime)
    function playAlarm() {
        if(!prefs.sound) return;
        
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Note 1: C5
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
            
            gain1.gain.setValueAtTime(0, ctx.currentTime);
            gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
            
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.4);
            
            // Note 2: G5 (played slightly after)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15);
            
            gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
            gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
            
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 1.2);
            
        } catch(e) {}
    }

    // 9. Timer Engine & Controls
    function updateDigit(el, val) {
        if (el.textContent !== val) {
            el.classList.remove('flip-animate');
            void el.offsetWidth;
            el.classList.add('flip-animate');
            setTimeout(() => { el.textContent = val; }, 250);
        }
    }

    function startTimer() {
        clearInterval(timerInterval);
        els.liveCard.classList.add('hidden');
        updateButtonsState();
        if (!activeEvent.isPaused) {
            timerInterval = setInterval(tick, 1000);
        }
        tick(); 
    }

    function getRemainingMs() {
        if(activeEvent.isPaused) {
            return activeEvent.remainingMs;
        } else {
            return parseLocalDateTime(activeEvent.date).getTime() - Date.now();
        }
    }

    function tick() {
        if(!activeEvent) return;
        
        const diff = getRemainingMs();
        
        if (diff <= 0) {
            clearInterval(timerInterval);
            updateDigit(els.daysVal, '00');
            updateDigit(els.hoursVal, '00');
            updateDigit(els.minutesVal, '00');
            updateDigit(els.secondsVal, '00');
            
            els.progressBar.style.width = '100%';
            els.progressText.textContent = '100.00% Completed';
            els.circlePercentage.textContent = '100%';
            els.circleProgressText.textContent = '100.00% Completed';
            els.circularProgress.style.strokeDashoffset = '0';
            
            els.pauseBtn.disabled = true;
            els.resumeBtn.disabled = true;

            if(els.liveCard.classList.contains('hidden')) {
                els.liveCard.classList.remove('hidden');
                
                if (!activeEvent.soundPlayed) {
                    fireConfetti();
                    playAlarm();
                    activeEvent.soundPlayed = true;
                    saveData();
                    pushNotification(`Event Live: ${activeEvent.name}!`, activeEvent.id);
                }
            }
            return;
        }
        
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / 1000 / 60) % 60);
        const s = Math.floor((diff / 1000) % 60);
        
        updateDigit(els.daysVal, String(d).padStart(2, '0'));
        updateDigit(els.hoursVal, String(h).padStart(2, '0'));
        updateDigit(els.minutesVal, String(m).padStart(2, '0'));
        updateDigit(els.secondsVal, String(s).padStart(2, '0'));
        
        const totalDurationMs = parseLocalDateTime(activeEvent.originalDate).getTime() - (activeEvent.createdAt || (parseLocalDateTime(activeEvent.originalDate).getTime() - 2592000000));
        const elapsed = Math.max(0, totalDurationMs - diff);
        let progress = (elapsed / totalDurationMs) * 100;
        if(progress > 100) progress = 100;
        if(progress < 0) progress = 0;
        
        const progressStr = `${progress.toFixed(2)}% Completed`;
        els.progressBar.style.width = `${progress}%`;
        els.progressText.textContent = progressStr;
        els.circlePercentage.textContent = `${Math.floor(progress)}%`;
        els.circleProgressText.textContent = progressStr;
        
        const circumference = 276.46;
        const offset = circumference - (progress / 100) * circumference;
        els.circularProgress.style.strokeDashoffset = offset;
    }

    function updateButtonsState() {
        const diff = getRemainingMs();
        if(diff <= 0) {
            els.pauseBtn.disabled = true;
            els.resumeBtn.disabled = true;
        } else {
            els.pauseBtn.disabled = activeEvent.isPaused;
            els.resumeBtn.disabled = !activeEvent.isPaused;
        }
        els.resetBtn.disabled = false;
    }

    els.pauseBtn.addEventListener('click', () => {
        if(!activeEvent.isPaused) {
            clearInterval(timerInterval); // Stop the interval immediately
            activeEvent.remainingMs = parseLocalDateTime(activeEvent.date).getTime() - Date.now();
            activeEvent.isPaused = true;
            saveData();
            tick(); // Update UI immediately to freeze at exact paused time
            updateButtonsState();
            showToast("Countdown paused", "info");
        }
    });

    els.resumeBtn.addEventListener('click', () => {
        if(activeEvent.isPaused) {
            activeEvent.date = toLocalISOString(Date.now() + activeEvent.remainingMs);
            activeEvent.isPaused = false;
            saveData();
            updateInputs();
            startTimer(); // Restart the timer interval safely
            showToast("Countdown resumed", "info");
        }
    });

    els.resetBtn.addEventListener('click', () => {
        openModal(els.resetModal, els.resetContent);
    });

    els.closeResetBtn.addEventListener('click', () => closeModal(els.resetModal, els.resetContent));
    els.cancelResetBtn.addEventListener('click', () => closeModal(els.resetModal, els.resetContent));

    function resetCountdown() {
        if (!activeEvent) return;

        clearInterval(timerInterval);

        const originalDateMs = parseLocalDateTime(activeEvent.originalDate || activeEvent.date).getTime();
        const createdAtMs = activeEvent.createdAt || (originalDateMs - 3600000); // Fallback to 1 hour ago
        let duration = originalDateMs - createdAtMs;
        if (duration <= 0) {
            duration = 3600000; // Default to 1 hour
        }

        if (originalDateMs <= Date.now()) {
            // Event is completed/in the past. Shift target date relative to NOW to restart countdown.
            activeEvent.createdAt = Date.now();
            activeEvent.date = toLocalISOString(Date.now() + duration);
            activeEvent.originalDate = activeEvent.date;
            activeEvent.remainingMs = duration;
        } else {
            // Event is in the future. Keep the fixed target date, but reset the countdown start time to NOW.
            activeEvent.createdAt = Date.now();
            activeEvent.date = activeEvent.originalDate || activeEvent.date;
            activeEvent.remainingMs = parseLocalDateTime(activeEvent.date).getTime() - Date.now();
        }

        activeEvent.isPaused = true; // Halt any active playback without triggering an immediate restart (paused at 0% progress)
        activeEvent.soundPlayed = false;

        els.liveCard.classList.add('hidden');
        
        saveData();
        updateInputs();
        renderGrid(); // Keep grid dates in sync
        
        startTimer(); // Update UI immediately to show 0% progress and the restored duration, remaining paused
        
        closeModal(els.resetModal, els.resetContent);

        showToast("Countdown reset successfully", "success");
    }

    els.confirmResetBtn.onclick = resetCountdown;

    if (els.replaySoundBtn) {
        els.replaySoundBtn.addEventListener('click', () => {
            playAlarm();
            fireConfetti();
        });
    }

    // Sidebar navigation to event section
    els.sidebarEventsBtn.addEventListener('click', () => {
        document.getElementById('mainContent').scrollTo({ top: document.getElementById('eventsSection').offsetTop, behavior: 'smooth' });
        if(window.innerWidth < 768) toggleMobileMenu();
    });

    function fireConfetti() {
        if(typeof confetti !== 'undefined') {
            const duration = 4000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({ particleCount: 8, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#5B5BF7', '#9333ea', '#10b981', '#f97316'] });
                confetti({ particleCount: 8, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#5B5BF7', '#9333ea', '#10b981', '#f97316'] });
                if (Date.now() < end) requestAnimationFrame(frame);
            }());
        }
    }

    // Init
    renderSelector();
    renderGrid();
    updateInputs();
    startTimer();
});
