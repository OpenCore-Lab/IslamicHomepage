// Islamic Homepage Script
class IslamicHomepage {
    constructor() {
        this.currentWallpaperIndex = 0;
        this.wallpapers = [];
        this.defaultWallpaper = 'bg/bg_default.jpg';
        this.clockFormat = '12';
        this.wallpaperInterval = null;
        this.verseInterval = null;
        this.prayerTimesInterval = null;
        this.currentLocation = null;
        this.notificationsEnabled = {
            Fajr: true,
            Dhuhr: true,
            Asr: true,
            Maghrib: true,
            Isha: true
        };
        this.todayPrayerTimes = null;
        this.tomorrowPrayerTimes = null;
        this.focusModeActive = false;
        this.azanAudio = null;
        this.azanFajrAudio = null;
        this.islamicMonths = [
            'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
            'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
            'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
        ];
        this.currentTestPrayerIndex = 0;
        this.testAzanAudio = null;
        this.isModalActive = false;
        
        // Quran Player properties
        this.quranAudio = null;
        this.currentSurah = 1;
        this.currentAyah = 1;
        this.isPlaying = false;
        this.currentReciter = 'ar.alafasy';
        this.autoPlay = false; // Auto-play off by default
        
        this.init();
        this.setupVisibilityHandling();
    }

    init() {
        this.loadLocalWallpapers();
        this.updateTime();
        this.updateCombinedDate();
        this.loadRandomVerse();
        this.setWallpaper();
        this.setupEventListeners();
        this.setupPrayerTimesListeners();
        this.setupAudioElements();
        this.setupQuranPlayer();
        this.startIntervals();
        this.applySettings();
        this.autoDetectLocationOnStartup();
    }

    setupVisibilityHandling() {
        // Handle page visibility changes for cross-tab modal functionality
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isModalActive) {
                // Tab became visible and modal should be active
                this.showActiveModal();
            }
        });

        // Listen for storage changes to sync modal state across tabs
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.activeModal) {
                    if (changes.activeModal.newValue && !document.hidden) {
                        this.showCrossTabModal(changes.activeModal.newValue);
                    } else if (!changes.activeModal.newValue) {
                        this.hideCrossTabModal();
                    }
                }
            });
        }
    }

    showActiveModal() {
        // Check if there's an active modal that should be displayed
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['activeModal'], (result) => {
                if (result.activeModal) {
                    this.showCrossTabModal(result.activeModal);
                }
            });
        }
    }

    showCrossTabModal(modalData) {
        if (modalData.type === 'azan') {
            this.showAzanModal(modalData.prayer);
        }
        this.isModalActive = true;
    }

    hideCrossTabModal() {
        this.closeAzanModal();
        this.isModalActive = false;
    }

    setActiveModalState(modalData) {
        // Store active modal state for cross-tab synchronization
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ activeModal: modalData });
        }
        this.isModalActive = !!modalData;
    }

    clearActiveModalState() {
        // Clear active modal state
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove(['activeModal']);
        }
        this.isModalActive = false;
    }

    async loadLocalWallpapers() {
        // Load images from bg folder
        const bgImages = ['bg_default.jpg','bg_01.png'];
        this.wallpapers = bgImages.map(img => `bg/${img}`);
        
        // Set default wallpaper
        if (this.wallpapers.length === 0) {
            this.wallpapers = [this.defaultWallpaper];
        }
    }

    updateTime() {
        const now = new Date();
        const is12Hour = this.clockFormat === '12';
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: is12Hour,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        document.getElementById('currentTime').textContent = timeString;
    }

    async updateCombinedDate() {
        const now = new Date();
        
        // English date
        const englishDate = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        // Get Islamic date
        try {
            const response = await fetch(`https://api.aladhan.com/v1/gToH/${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`);
            const data = await response.json();
            
            if (data.code === 200) {
                const hijriDate = data.data.hijri;
                const hijriDateText = `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year} AH`;
                
                document.getElementById('englishDate').textContent = englishDate;
                document.getElementById('hijriDate').textContent = hijriDateText;
            }
        } catch (error) {
            console.error('Error fetching Islamic date:', error);
            document.getElementById('englishDate').textContent = englishDate;
            document.getElementById('hijriDate').textContent = 'Islamic Date Unavailable';
        }
    }



    async loadRandomVerse() {
        try {
            // Show loading state
            const verseArabic = document.getElementById('verseArabic');
            const verseEnglish = document.getElementById('verseEnglish');
            const verseReference = document.getElementById('verseReference');
            
            if (verseArabic) verseArabic.classList.add('loading');
            if (verseEnglish) verseEnglish.classList.add('loading');
            if (verseReference) verseReference.classList.add('loading');
            
            // Get random surah and ayah
            const randomSurah = Math.floor(Math.random() * 114) + 1;
            let maxAyah = 286; // Default for Al-Baqarah
            
            // Get surah info first to know the number of ayahs
            const surahResponse = await fetch(`https://api.alquran.cloud/v1/surah/${randomSurah}`);
            const surahData = await surahResponse.json();
            
            if (surahData.code === 200) {
                maxAyah = surahData.data.numberOfAyahs;
            }
            
            const randomAyah = Math.floor(Math.random() * maxAyah) + 1;
            
            // Fetch Arabic verse
            const arabicResponse = await fetch(`https://api.alquran.cloud/v1/ayah/${randomSurah}:${randomAyah}`);
            const arabicData = await arabicResponse.json();
            
            // Fetch English translation
            const englishResponse = await fetch(`https://api.alquran.cloud/v1/ayah/${randomSurah}:${randomAyah}/en.asad`);
            const englishData = await englishResponse.json();
            
            if (arabicData.code === 200 && englishData.code === 200) {
                const arabicVerse = arabicData.data.text;
                const englishVerse = englishData.data.text;
                const surahName = arabicData.data.surah.englishName;
                const ayahNumber = arabicData.data.numberInSurah;
                
                if (verseArabic) document.getElementById('verseArabic').textContent = arabicVerse;
                if (verseEnglish) document.getElementById('verseEnglish').textContent = englishVerse;
                if (verseReference) document.getElementById('verseReference').textContent = `${surahName} ${ayahNumber}`;
            } else {
                throw new Error('Failed to fetch verse data');
            }
        } catch (error) {
            console.error('Error loading verse:', error);
            const verseArabic = document.getElementById('verseArabic');
            const verseEnglish = document.getElementById('verseEnglish');
            const verseReference = document.getElementById('verseReference');
            
            if (verseArabic) verseArabic.textContent = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
            if (verseEnglish) verseEnglish.textContent = 'In the name of Allah, the Most Gracious, the Most Merciful.';
            if (verseReference) verseReference.textContent = 'Al-Fatiha 1';
        } finally {
            // Remove loading state
            const verseArabic = document.getElementById('verseArabic');
            const verseEnglish = document.getElementById('verseEnglish');
            const verseReference = document.getElementById('verseReference');
            const verseContainer = document.querySelector('.verse-container');
            
            if (verseArabic) verseArabic.classList.remove('loading');
            if (verseEnglish) verseEnglish.classList.remove('loading');
            if (verseReference) verseReference.classList.remove('loading');
            
            // Add fade-in animation
            if (verseContainer) verseContainer.classList.add('fade-in');
            
            // Adjust text size to fit container
            this.adjustVerseTextSize();
        }
    }
    
    adjustVerseTextSize() {
        const container = document.querySelector('.verse-container');
        const arabicElement = document.getElementById('verseArabic');
        const englishElement = document.getElementById('verseEnglish');
        const referenceElement = document.getElementById('verseReference');
        
        if (!container || !arabicElement || !englishElement || !referenceElement) return;
        
        // Reset to default sizes
        arabicElement.style.fontSize = '1.8rem';
        englishElement.style.fontSize = '1.1rem';
        referenceElement.style.fontSize = '0.9rem';
        
        // Check if content overflows
        let attempts = 0;
        const maxAttempts = 10;
        
        while (container.scrollHeight > container.clientHeight && attempts < maxAttempts) {
            const currentArabicSize = parseFloat(window.getComputedStyle(arabicElement).fontSize);
            const currentEnglishSize = parseFloat(window.getComputedStyle(englishElement).fontSize);
            const currentReferenceSize = parseFloat(window.getComputedStyle(referenceElement).fontSize);
            
            // Reduce font sizes by 10%
            arabicElement.style.fontSize = (currentArabicSize * 0.9) + 'px';
            englishElement.style.fontSize = (currentEnglishSize * 0.9) + 'px';
            referenceElement.style.fontSize = (currentReferenceSize * 0.9) + 'px';
            
            attempts++;
        }
    }

    setWallpaper() {
        const setBackground = (opacity = 0.3) => {
            const wallpaperUrl = this.wallpapers[this.currentWallpaperIndex];
            
            document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, ${opacity}), rgba(0, 0, 0, ${opacity})), url('${wallpaperUrl}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
        };

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['overlayOpacity'], (result) => {
                const opacity = result.overlayOpacity || 0.3;
                setBackground(opacity);
            });
            // Store current wallpaper index
            chrome.storage.local.set({ currentWallpaperIndex: this.currentWallpaperIndex });
        } else {
            setBackground(0.3);
        }
    }

    rotateWallpaper() {
        this.currentWallpaperIndex = (this.currentWallpaperIndex + 1) % this.wallpapers.length;
        this.setWallpaper();
    }

    setupEventListeners() {
        const newVerseBtn = document.getElementById('newVerseBtn');
        if (newVerseBtn) {
            newVerseBtn.addEventListener('click', () => {
                this.loadRandomVerse();
            });
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
            });
        }



        // Test modal action buttons
        const testStopBtn = document.getElementById('testStopBtn');
        const testBreakBtn = document.getElementById('testBreakBtn');
        
        if (testStopBtn) {
            testStopBtn.addEventListener('click', () => this.closeTestPrayerModal());
        }
        
        if (testBreakBtn) {
            testBreakBtn.addEventListener('click', () => {
                this.closeTestPrayerModal();
                // You can add additional logic here for the "Take a break for Salah" action
                console.log('Taking a break for Salah...');
            });
        }

        // Listen for settings updates
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local') {
                    this.applySettings();
                }
            });
        }
    }

    startIntervals() {
        // Update time every second
        setInterval(() => this.updateTime(), 1000);
        
        // Update combined date every hour
        setInterval(() => this.updateCombinedDate(), 3600000);
        
        // Load settings and start dynamic intervals
        this.applySettings();
    }

    applySettings() {
        const defaultSettings = {
            wallpaperRotation: true,
            rotationInterval: 1,
            verseRotationType: 'automatic',
            verseInterval: 30,
            clockFormat: '12'
        };

        const processSettings = (settings) => {
            // Clear existing intervals
            if (this.wallpaperInterval) clearInterval(this.wallpaperInterval);
            if (this.verseInterval) clearInterval(this.verseInterval);
            
            // Set wallpaper rotation interval
            if (settings.wallpaperRotation) {
                const wallpaperMs = settings.rotationInterval * 60 * 60 * 1000; // Convert hours to ms
                this.wallpaperInterval = setInterval(() => this.rotateWallpaper(), wallpaperMs);
            }
            
            // Set verse rotation interval
            if (settings.verseRotationType === 'automatic') {
                const verseMs = settings.verseInterval * 60 * 1000; // Convert minutes to ms
                this.verseInterval = setInterval(() => this.loadRandomVerse(), verseMs);
            }
            
            // Update clock format
            this.clockFormat = settings.clockFormat;
            this.updateTime();
            
            // Show/hide new verse button based on verse rotation type
            const newVerseBtn = document.getElementById('newVerseBtn');
            if (newVerseBtn) {
                newVerseBtn.style.display = settings.verseRotationType === 'manual' ? 'block' : 'none';
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(defaultSettings, processSettings);
        } else {
            processSettings(defaultSettings);
        }
    }

    // Load saved settings
    async loadSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const result = await chrome.storage.local.get([
                    'currentWallpaperIndex',
                    'autoRotateWallpaper',
                    'autoRefreshVerse',
                    'showIslamicCalendar',
                    'notificationsEnabled',
                    'focusModeActive'
                ]);
                
                if (result.currentWallpaperIndex !== undefined) {
                    this.currentWallpaperIndex = result.currentWallpaperIndex;
                }
                
                // Apply notification settings
                if (result.notificationsEnabled !== undefined) {
                    // Handle both old boolean format and new object format
                    if (typeof result.notificationsEnabled === 'boolean') {
                        // Convert old format to new format
                        const enabled = result.notificationsEnabled;
                        this.notificationsEnabled = {
                            Fajr: enabled,
                            Dhuhr: enabled,
                            Asr: enabled,
                            Maghrib: enabled,
                            Isha: enabled
                        };
                    } else {
                        this.notificationsEnabled = result.notificationsEnabled;
                    }
                    this.updateNotificationButtons();
                }
                
                // Apply focus mode state
                if (result.focusModeActive) {
                    this.focusModeActive = true;
                    const focusMode = document.getElementById('focusMode');
                    if (focusMode) {
                        focusMode.style.display = 'flex';
                    }
                }
                
                // Apply other settings as needed
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
    }

    setupPrayerTimesListeners() {
        const stopAzanBtn = document.getElementById('stopAzanBtn');
        const takeSalahBreakBtn = document.getElementById('takeSalahBreakBtn');
        const endFocusBtn = document.getElementById('endFocusBtn');

        // Individual prayer notification buttons
        const prayerNotifyBtns = document.querySelectorAll('.prayer-notify-btn');

        // Setup individual prayer notification toggles
        prayerNotifyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const prayer = btn.getAttribute('data-prayer');
                this.togglePrayerNotification(prayer);
            });
        });

        // Manual location detection button
        const detectLocationBtn = document.getElementById('detectLocationBtn');
        if (detectLocationBtn) {
            detectLocationBtn.addEventListener('click', () => {
                this.detectLocationManually();
            });
        }

        if (stopAzanBtn) {
            stopAzanBtn.addEventListener('click', () => this.stopAzan());
        }

        if (takeSalahBreakBtn) {
            takeSalahBreakBtn.addEventListener('click', () => this.startFocusMode());
        }

        if (endFocusBtn) {
            endFocusBtn.addEventListener('click', () => this.endFocusMode());
        }
    }

    setupAudioElements() {
        this.azanAudio = document.getElementById('azanAudio');
        this.azanFajrAudio = document.getElementById('azanFajrAudio');
    }

    autoDetectLocationOnStartup() {
        // Show location detection status
        const locationStatus = document.getElementById('locationStatus');
        if (locationStatus) {
            locationStatus.style.display = 'block';
        }

        // Check if we have stored location first
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['userLocation'], (result) => {
                if (result.userLocation) {
                    this.currentLocation = result.userLocation;
                    this.fetchBothDaysPrayerTimes(result.userLocation.lat, result.userLocation.lng);
                    return;
                }
                
                // If no stored location, auto-detect
                this.detectLocationAutomatically();
            });
        } else {
            // If no chrome storage, auto-detect
            this.detectLocationAutomatically();
        }
    }

    detectLocationAutomatically() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Store location
                    this.currentLocation = { lat, lng };
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        chrome.storage.local.set({ userLocation: this.currentLocation });
                    }
                    
                    this.fetchBothDaysPrayerTimes(lat, lng);
                },
                (error) => {
                    let errorMessage = 'Unable to detect location automatically';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied. Please allow location access or use manual detection.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable. Please try manual detection.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please try again or use manual detection.';
                            break;
                        default:
                            errorMessage = 'Unknown location error. Please try manual detection.';
                            break;
                    }
                    
                    console.error('Geolocation error:', error.message || errorMessage);
                    this.showManualLocationDetectionWithMessage(errorMessage);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser.');
            this.showManualLocationDetectionWithMessage('Geolocation is not supported by this browser. Please use manual detection.');
        }
    }

    async setLocationManually() {
        const locationInput = document.getElementById('locationInput');
        const location = locationInput.value.trim();
        
        if (!location) {
            alert('Please enter a location');
            return;
        }

        try {
            // Geocode the location
            const geocodeResponse = await fetch(`https://api.aladhan.com/v1/addressToCoordinates/${encodeURIComponent(location)}`);
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData.code === 200 && geocodeData.data.length > 0) {
                const coords = geocodeData.data[0];
                this.currentLocation = {
                    city: location,
                    latitude: coords.latitude,
                    longitude: coords.longitude
                };
                
                // Store location
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set({ userLocation: this.currentLocation });
                }
                
                await this.fetchPrayerTimes();
                locationInput.value = '';
            } else {
                alert('Location not found. Please try a different location.');
            }
        } catch (error) {
            console.error('Error setting location:', error);
            alert('Error setting location. Please try again.');
        }
    }

    async detectLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by this browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    // Reverse geocode to get city name
                    const response = await fetch(`https://api.aladhan.com/v1/coordinatesToAddress/${latitude},${longitude}`);
                    const data = await response.json();
                    
                    let cityName = 'Unknown Location';
                    if (data.code === 200 && data.data) {
                        cityName = data.data.city || data.data.country || 'Unknown Location';
                    }
                    
                    this.currentLocation = {
                        city: cityName,
                        latitude: latitude,
                        longitude: longitude
                    };
                    
                    // Store location
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        chrome.storage.local.set({ userLocation: this.currentLocation });
                    }
                    
                    await this.fetchPrayerTimes();
                } catch (error) {
                    console.error('Error getting location details:', error);
                    alert('Error detecting location. Please try manual entry.');
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to detect location. Please enter manually.');
            }
        );
    }

    async fetchBothDaysPrayerTimes(lat, lng) {
        // Validate coordinates
        if (!lat || !lng || lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
            console.error('Invalid coordinates provided:', { lat, lng });
            this.showManualLocationDetection();
            return;
        }
        
        try {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Fetch today's prayer times
            const todayResponse = await fetch(`https://api.aladhan.com/v1/timings/${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}?latitude=${lat}&longitude=${lng}&method=2`);
            const todayData = await todayResponse.json();
            
            // Fetch tomorrow's prayer times
            const tomorrowResponse = await fetch(`https://api.aladhan.com/v1/timings/${tomorrow.getDate()}-${tomorrow.getMonth() + 1}-${tomorrow.getFullYear()}?latitude=${lat}&longitude=${lng}&method=2`);
            const tomorrowData = await tomorrowResponse.json();
            
            if (todayData.code === 200 && tomorrowData.code === 200) {
                this.todayPrayerTimes = todayData.data.timings;
                this.tomorrowPrayerTimes = tomorrowData.data.timings;
                
                this.displayEnhancedPrayerTimes();
                this.hideLocationStatus();
                this.startPrayerTimeChecking();
                
                // Update current location display
                this.updateCurrentLocationDisplay(lat, lng);
            } else {
                console.error('API returned error codes:', { todayCode: todayData.code, tomorrowCode: tomorrowData.code });
                this.showManualLocationDetection();
            }
        } catch (error) {
            console.error('Error fetching prayer times:', error);
            this.showManualLocationDetection();
        }
    }

    async fetchPrayerTimes() {
        if (!this.currentLocation) return;
        
        try {
            const today = new Date();
            const response = await fetch(
                `https://api.aladhan.com/v1/timings/${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}?latitude=${this.currentLocation.latitude}&longitude=${this.currentLocation.longitude}&method=2`
            );
            const data = await response.json();
            
            if (data.code === 200) {
                this.todayPrayerTimes = data.data.timings;
                this.updatePrayerDisplay();
                this.displayAllPrayerTimes();
                this.hideLocationSetup();
                this.startPrayerTimeChecking();
            }
        } catch (error) {
            console.error('Error fetching prayer times:', error);
        }
    }

    hideLocationStatus() {
         const locationStatus = document.getElementById('locationStatus');
         const locationControls = document.getElementById('locationControls');
         
         if (locationStatus) {
             locationStatus.style.display = 'none';
         }
         
         if (locationControls) {
             locationControls.style.display = 'none';
         }
     }

    displayEnhancedPrayerTimes() {
         if (!this.todayPrayerTimes) return;
 
         const allPrayerTimes = document.getElementById('allPrayerTimes');
         if (allPrayerTimes) {
             allPrayerTimes.style.display = 'block';
         }
 
         const now = new Date();
         const currentTime = now.getHours() * 60 + now.getMinutes();
         
         // Update individual prayer times with enhanced display
         const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
         prayers.forEach(prayer => {
             const timeElement = document.getElementById(`${prayer.toLowerCase()}Time`);
             const dayElement = document.getElementById(`${prayer.toLowerCase()}Day`);
             const remainingElement = document.getElementById(`${prayer.toLowerCase()}Remaining`);
             
             if (timeElement && this.todayPrayerTimes[prayer]) {
                 const [hours, minutes] = this.todayPrayerTimes[prayer].split(':').map(Number);
                 const prayerTimeInMinutes = hours * 60 + minutes;
                 
                 // Determine if prayer has passed
                 const hasPassed = prayerTimeInMinutes <= currentTime;
                 
                 if (hasPassed && this.tomorrowPrayerTimes && this.tomorrowPrayerTimes[prayer]) {
                     // Show tomorrow's time for passed prayers
                     const [tomorrowHours, tomorrowMinutes] = this.tomorrowPrayerTimes[prayer].split(':').map(Number);
                     timeElement.textContent = this.formatTime12Hour(tomorrowHours, tomorrowMinutes);
                     
                     if (dayElement) {
                         dayElement.textContent = 'Tomorrow';
                     }
                     
                     if (remainingElement) {
                         const tomorrowTimeInMinutes = (tomorrowHours * 60 + tomorrowMinutes) + (24 * 60);
                         const timeDiff = tomorrowTimeInMinutes - currentTime;
                         const hoursRemaining = Math.floor(timeDiff / 60);
                         const minutesRemaining = timeDiff % 60;
                         
                         let remainingText = '';
                         if (hoursRemaining > 0) {
                             remainingText = `in ${hoursRemaining}h ${minutesRemaining}m`;
                         } else {
                             remainingText = `in ${minutesRemaining}m`;
                         }
                         remainingElement.textContent = remainingText;
                         remainingElement.className = 'prayer-remaining';
                     }
                 } else {
                     // Show today's time
                     timeElement.textContent = this.formatTime12Hour(hours, minutes);
                     
                     if (dayElement) {
                         dayElement.textContent = '';
                     }
                     
                     if (remainingElement) {
                         if (hasPassed) {
                             remainingElement.textContent = 'Passed';
                             remainingElement.className = 'prayer-remaining passed';
                         } else {
                             const timeDiff = prayerTimeInMinutes - currentTime;
                             const hoursRemaining = Math.floor(timeDiff / 60);
                             const minutesRemaining = timeDiff % 60;
                             
                             let remainingText = '';
                             if (hoursRemaining > 0) {
                                 remainingText = `in ${hoursRemaining}h ${minutesRemaining}m`;
                             } else {
                                 remainingText = `in ${minutesRemaining}m`;
                             }
                             remainingElement.textContent = remainingText;
                             remainingElement.className = 'prayer-remaining next';
                         }
                     }
                 }
             }
         });
 
         // Update notification button states
         this.updateNotificationButtons();
     }

    updateEnhancedPrayerDisplay() {
        if (!this.todayPrayerTimes || !this.tomorrowPrayerTimes) return;
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const todayPrayers = [
            { name: 'Fajr', time: this.todayPrayerTimes.Fajr, day: 'today' },
            { name: 'Dhuhr', time: this.todayPrayerTimes.Dhuhr, day: 'today' },
            { name: 'Asr', time: this.todayPrayerTimes.Asr, day: 'today' },
            { name: 'Maghrib', time: this.todayPrayerTimes.Maghrib, day: 'today' },
            { name: 'Isha', time: this.todayPrayerTimes.Isha, day: 'today' }
        ];
        
        const tomorrowPrayers = [
            { name: 'Fajr', time: this.tomorrowPrayerTimes.Fajr, day: 'tomorrow' }
        ];
        
        const allPrayers = [...todayPrayers, ...tomorrowPrayers];
        
        let nextPrayer = null;
        
        for (const prayer of allPrayers) {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            let prayerTimeInMinutes = hours * 60 + minutes;
            
            // Add 24 hours for tomorrow's prayers
            if (prayer.day === 'tomorrow') {
                prayerTimeInMinutes += 24 * 60;
            }
            
            if (prayerTimeInMinutes > currentTime) {
                nextPrayer = {
                    ...prayer,
                    timeInMinutes: prayerTimeInMinutes
                };
                break;
            }
        }
        
        if (nextPrayer) {
            this.displayNextPrayerEnhanced(nextPrayer, currentTime);
        }
    }

    displayNextPrayerEnhanced(nextPrayer, currentTime) {
        const prayerNameEl = document.getElementById('prayerName');
        const prayerTimeEl = document.getElementById('prayerTime');
        const timeRemainingEl = document.getElementById('timeRemaining');
        const nextPrayerEl = document.getElementById('nextPrayer');
        
        if (prayerNameEl) {
            const dayIndicator = nextPrayer.day === 'tomorrow' ? ' (Tomorrow)' : '';
            prayerNameEl.textContent = nextPrayer.name + dayIndicator;
        }
        
        if (prayerTimeEl) {
            const [hours, minutes] = nextPrayer.time.split(':').map(Number);
            const time12 = this.formatTime12Hour(hours, minutes);
            prayerTimeEl.textContent = time12;
        }
        
        if (timeRemainingEl) {
            const timeDiff = nextPrayer.timeInMinutes - currentTime;
            const hoursRemaining = Math.floor(timeDiff / 60);
            const minutesRemaining = timeDiff % 60;
            
            let remainingText = '';
            if (hoursRemaining > 0) {
                remainingText = `(${hoursRemaining}h ${minutesRemaining}m from now)`;
            } else {
                remainingText = `(${minutesRemaining} min from now)`;
            }
            timeRemainingEl.textContent = remainingText;
        }
        
        if (nextPrayerEl) {
            nextPrayerEl.style.display = 'block';
        }
    }

    updatePrayerDisplay() {
        if (!this.todayPrayerTimes) return;
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const prayers = [
            { name: 'Fajr', time: this.todayPrayerTimes.Fajr },
            { name: 'Dhuhr', time: this.todayPrayerTimes.Dhuhr },
            { name: 'Asr', time: this.todayPrayerTimes.Asr },
            { name: 'Maghrib', time: this.todayPrayerTimes.Maghrib },
            { name: 'Isha', time: this.todayPrayerTimes.Isha }
        ];
        
        let nextPrayer = null;
        
        for (const prayer of prayers) {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            const prayerTimeInMinutes = hours * 60 + minutes;
            
            if (prayerTimeInMinutes > currentTime) {
                nextPrayer = {
                    ...prayer,
                    timeInMinutes: prayerTimeInMinutes
                };
                break;
            }
        }
        
        // If no prayer found for today, get Fajr for tomorrow
        if (!nextPrayer) {
            nextPrayer = {
                ...prayers[0],
                timeInMinutes: prayers[0].time.split(':').map(Number).reduce((h, m) => h * 60 + m) + 24 * 60
            };
        }
        
        this.displayNextPrayer(nextPrayer, currentTime);
    }

    displayNextPrayer(nextPrayer, currentTime) {
        const prayerNameEl = document.getElementById('prayerName');
        const prayerTimeEl = document.getElementById('prayerTime');
        const timeRemainingEl = document.getElementById('timeRemaining');
        const nextPrayerEl = document.getElementById('nextPrayer');
        
        if (prayerNameEl) prayerNameEl.textContent = nextPrayer.name;
        if (prayerTimeEl) {
            const [hours, minutes] = nextPrayer.time.split(':').map(Number);
            const time12 = this.formatTime12Hour(hours, minutes);
            prayerTimeEl.textContent = time12;
        }
        
        if (timeRemainingEl) {
            const timeDiff = nextPrayer.timeInMinutes - currentTime;
            const hoursRemaining = Math.floor(timeDiff / 60);
            const minutesRemaining = timeDiff % 60;
            
            let remainingText = '';
            if (hoursRemaining > 0) {
                remainingText = `(${hoursRemaining}h ${minutesRemaining}m from now)`;
            } else {
                remainingText = `(${minutesRemaining} min from now)`;
            }
            timeRemainingEl.textContent = remainingText;
        }
        
        if (nextPrayerEl) {
            nextPrayerEl.style.display = 'block';
        }
    }

    formatTime12Hour(hours, minutes) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    hideLocationSetup() {
        const locationSetup = document.getElementById('locationSetup');
        if (locationSetup) {
            locationSetup.style.display = 'none';
        }
    }

    displayAllPrayerTimes() {
        if (!this.todayPrayerTimes) return;

        const allPrayerTimes = document.getElementById('allPrayerTimes');
        if (allPrayerTimes) {
            allPrayerTimes.style.display = 'block';
        }

        // Update individual prayer times
        const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        prayers.forEach(prayer => {
            const timeElement = document.getElementById(`${prayer.toLowerCase()}Time`);
            if (timeElement && this.todayPrayerTimes[prayer]) {
                const [hours, minutes] = this.todayPrayerTimes[prayer].split(':').map(Number);
                timeElement.textContent = this.formatTime12Hour(hours, minutes);
            }
        });

        // Update notification button states
        this.updateNotificationButtons();
    }

    updateNotificationButtons() {
        const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        prayers.forEach(prayer => {
            const btn = document.getElementById(`${prayer.toLowerCase()}Notify`);
            if (btn) {
                if (this.notificationsEnabled[prayer]) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    togglePrayerNotification(prayer) {
        this.notificationsEnabled[prayer] = !this.notificationsEnabled[prayer];
        this.updateNotificationButtons();
        
        // Save to storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 
                notificationsEnabled: this.notificationsEnabled 
            });
        }
    }

    startPrayerTimeChecking() {
        // Check every minute for prayer time
        if (this.prayerTimesInterval) {
            clearInterval(this.prayerTimesInterval);
        }
        
        this.prayerTimesInterval = setInterval(() => {
            if (!this.focusModeActive) {
                this.updatePrayerDisplay();
                this.checkForPrayerTime();
                // Also refresh the display to update time remaining
                this.displayEnhancedPrayerTimes();
            }
        }, 60000); // Check every minute
    }

    checkForPrayerTime() {
        if (!this.todayPrayerTimes || this.focusModeActive) return;
        
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const prayers = [
            { name: 'Fajr', time: this.todayPrayerTimes.Fajr },
            { name: 'Dhuhr', time: this.todayPrayerTimes.Dhuhr },
            { name: 'Asr', time: this.todayPrayerTimes.Asr },
            { name: 'Maghrib', time: this.todayPrayerTimes.Maghrib },
            { name: 'Isha', time: this.todayPrayerTimes.Isha }
        ];
        
        for (const prayer of prayers) {
            if (prayer.time && 
                prayer.time.substring(0, 5) === currentTime && 
                this.notificationsEnabled[prayer.name]) {
                this.showAzanModal(prayer);
                // Refresh prayer times after showing azan
                setTimeout(() => {
                    this.autoRefreshPrayerTimes();
                }, 2000);
                break;
            }
        }
    }

    showAzanModal(prayer) {
        const modal = document.getElementById('azanModal');
        const azanTitle = document.getElementById('azanTitle');
        const azanTime = document.getElementById('azanTime');
        
        if (azanTitle) azanTitle.textContent = `${prayer.name} Prayer Time`;
        if (azanTime) {
            const [hours, minutes] = prayer.time.split(':').map(Number);
            azanTime.textContent = this.formatTime12Hour(hours, minutes);
        }
        
        if (modal) {
            modal.style.display = 'flex';
        }
        
        // Set active modal state for cross-tab functionality
        this.setActiveModalState({
            type: 'azan',
            prayer: prayer,
            timestamp: Date.now()
        });
        
        // Play appropriate azan
        this.playAzan(prayer.name);
        
        // Auto-close modal after azan finishes
        this.setupAzanAutoClose();
    }

    playAzan(prayerName) {
        const audio = prayerName === 'Fajr' ? this.azanFajrAudio : this.azanAudio;
        
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(error => {
                console.error('Error playing azan:', error);
            });
        }
    }

    setupAzanAutoClose() {
        const audio = this.azanAudio || this.azanFajrAudio;
        
        if (audio) {
            const handleAzanEnd = () => {
                setTimeout(() => {
                    this.closeAzanModal();
                }, 2000); // Close 2 seconds after azan ends
                audio.removeEventListener('ended', handleAzanEnd);
            };
            
            audio.addEventListener('ended', handleAzanEnd);
        }
    }

    stopAzan() {
        if (this.azanAudio) {
            this.azanAudio.pause();
            this.azanAudio.currentTime = 0;
        }
        if (this.azanFajrAudio) {
            this.azanFajrAudio.pause();
            this.azanFajrAudio.currentTime = 0;
        }
        this.closeAzanModal();
    }

    closeAzanModal() {
        const modal = document.getElementById('azanModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Clear active modal state
        this.clearActiveModalState();
    }

    startFocusMode() {
        this.focusModeActive = true;
        this.stopAzan();
        
        const focusMode = document.getElementById('focusMode');
        if (focusMode) {
            focusMode.style.display = 'flex';
        }
        
        // Store focus mode state
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ focusModeActive: true });
        }
    }

    endFocusMode() {
        this.focusModeActive = false;
        
        const focusMode = document.getElementById('focusMode');
        if (focusMode) {
            focusMode.style.display = 'none';
        }
        
        // Resume prayer time checking
        this.startPrayerTimeChecking();
        
        // Store focus mode state
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ focusModeActive: false });
        }
    }

    showManualLocationDetection() {
         this.showManualLocationDetectionWithMessage('Unable to detect location automatically');
     }

    showManualLocationDetectionWithMessage(message) {
         const locationStatus = document.getElementById('locationStatus');
         const locationControls = document.getElementById('locationControls');
         
         if (locationStatus) {
             locationStatus.innerHTML = `
                 <div class="location-text">${message}</div>
             `;
             locationStatus.style.display = 'block';
         }
         
         if (locationControls) {
             locationControls.style.display = 'block';
             // Re-attach event listener for the button
             const detectBtn = document.getElementById('detectLocationBtn');
             if (detectBtn) {
                 // Remove existing listeners to prevent duplicates
                 detectBtn.replaceWith(detectBtn.cloneNode(true));
                 const newDetectBtn = document.getElementById('detectLocationBtn');
                 newDetectBtn.addEventListener('click', () => {
                     this.detectLocationManually();
                 });
             }
         }
     }

    detectLocationManually() {
         // Hide manual controls and show loading state
         const locationStatus = document.getElementById('locationStatus');
         const locationControls = document.getElementById('locationControls');
         
         if (locationControls) {
             locationControls.style.display = 'none';
         }
         
         if (locationStatus) {
             locationStatus.innerHTML = '<div class="location-text">Detecting location...</div>';
         }
         
         // Try automatic detection again
         this.detectLocationAutomatically();
     }

    autoRefreshPrayerTimes() {
        if (this.currentLocation && this.currentLocation.lat && this.currentLocation.lng) {
            console.log('Auto-refreshing prayer times after prayer time passed');
            this.fetchBothDaysPrayerTimes(this.currentLocation.lat, this.currentLocation.lng);
        }
    }


       
       async updateCurrentLocationDisplay(lat, lng) {
            const locationElement = document.getElementById('locationInline');
            if (!locationElement) return;
           
           try {
               // Use reverse geocoding to get location name
               const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
               const data = await response.json();
               
               let locationText = '';
                if (data.city && data.countryName) {
                    locationText = `- Location: ${data.city}, ${data.countryName}`;
                } else if (data.locality && data.countryName) {
                    locationText = `- Location: ${data.locality}, ${data.countryName}`;
                } else if (data.countryName) {
                    locationText = `- Location: ${data.countryName}`;
                } else {
                    locationText = `- Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                }
                
                locationElement.textContent = locationText;
           } catch (error) {
               console.error('Error getting location name:', error);
               // Fallback to coordinates
               locationElement.textContent = `- Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
           }
       }
    
    // Quran Player Methods
    setupQuranPlayer() {
        this.quranAudio = document.getElementById('quranAudio');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        const progressBar = document.getElementById('progressBar');
        const surahDropdown = document.getElementById('surahDropdown');
        
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousSurah());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextSurah());
        }
        
        if (autoPlayBtn) {
            autoPlayBtn.addEventListener('click', () => this.toggleAutoPlay());
        }
        
        if (progressBar) {
            progressBar.addEventListener('click', (e) => this.seekAudio(e));
        }
        
        if (surahDropdown) {
            surahDropdown.addEventListener('change', (e) => this.changeSurah(parseInt(e.target.value)));
        }
        
        if (this.quranAudio) {
            this.quranAudio.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
            this.quranAudio.addEventListener('timeupdate', () => this.updateProgress());
            this.quranAudio.addEventListener('ended', () => {
                if (this.autoPlay) {
                    this.nextSurah(true); // true indicates auto-triggered
                } else {
                    this.isPlaying = false;
                    this.updatePlayPauseButton(false);
                }
            });
            this.quranAudio.addEventListener('error', (e) => {
                console.error('Audio error:', e);
                this.updateVerseName('Audio not available');
            });
        }
        
        // Load initial surah
        this.loadCurrentSurah();
        
        // Initialize auto-play button state
        this.updateAutoPlayButton();
    }
    
    toggleAutoPlay() {
        this.autoPlay = !this.autoPlay;
        this.updateAutoPlayButton();
    }
    
    updateAutoPlayButton() {
        const autoPlayBtn = document.getElementById('autoPlayBtn');
        if (autoPlayBtn) {
            if (this.autoPlay) {
                autoPlayBtn.classList.add('active');
                autoPlayBtn.title = 'Auto-play: On';
            } else {
                autoPlayBtn.classList.remove('active');
                autoPlayBtn.title = 'Auto-play: Off';
            }
        }
    }
    
    async loadCurrentSurah() {
        try {
            // Update surah name display
            this.updateVerseName('Loading...');
            
            // Fetch surah data from API
            const response = await fetch(`https://api.alquran.cloud/v1/surah/${this.currentSurah}`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                const surahName = data.data.englishName;
                const surahNameArabic = data.data.name;
                this.updateVerseName(`${surahName} (${surahNameArabic})`);
                
                // Load full surah audio - using surah-based URL
                const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${this.currentReciter}/${this.currentSurah}.mp3`;
                this.quranAudio.src = audioUrl;
                
                // Update dropdown selection
                const dropdown = document.getElementById('surahDropdown');
                if (dropdown) {
                    dropdown.value = this.currentSurah;
                }
                
                // Auto-play if enabled
                if (this.autoPlay && this.quranAudio) {
                    // Wait for audio to be ready before playing
                    this.quranAudio.addEventListener('canplay', () => {
                        this.quranAudio.play().then(() => {
                            this.isPlaying = true;
                            this.updatePlayPauseButton(true);
                        }).catch(error => {
                            console.error('Auto-play failed:', error);
                        });
                    }, { once: true });
                }
            } else {
                this.updateVerseName('Surah not found');
            }
        } catch (error) {
            console.error('Error loading surah:', error);
            this.updateVerseName('Error loading surah');
        }
    }
    
    updateVerseName(name) {
        const verseNameElement = document.getElementById('currentVerseName');
        if (verseNameElement) {
            verseNameElement.textContent = name;
        }
    }
    
    togglePlayPause() {
        if (!this.quranAudio) return;
        
        if (this.isPlaying) {
            this.quranAudio.pause();
            this.isPlaying = false;
            this.updatePlayPauseButton(false);
        } else {
            this.quranAudio.play().then(() => {
                this.isPlaying = true;
                this.updatePlayPauseButton(true);
            }).catch(error => {
                console.error('Error playing audio:', error);
                this.updateVerseName('Audio playback failed');
            });
        }
    }
    
    updatePlayPauseButton(isPlaying) {
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        
        if (playIcon && pauseIcon) {
            if (isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    }
    
    async nextSurah(autoTriggered = false) {
        // Move to next surah
        this.currentSurah++;
        
        // Check if we've reached the end of Quran
        if (this.currentSurah > 114) {
            this.currentSurah = 1;
        }
        
        // Only set playing state to false if not auto-triggered with auto-play enabled
        if (!autoTriggered || !this.autoPlay) {
            this.isPlaying = false;
            this.updatePlayPauseButton(false);
        }
        
        await this.loadCurrentSurah();
    }
    
    async previousSurah() {
        // Move to previous surah
        this.currentSurah--;
        
        // Check if we've reached the beginning
        if (this.currentSurah < 1) {
            this.currentSurah = 114; // Last surah
        }
        
        this.isPlaying = false;
        this.updatePlayPauseButton(false);
        await this.loadCurrentSurah();
    }
    
    async changeSurah(surahNumber) {
        // Change to selected surah
        this.currentSurah = surahNumber;
        
        this.isPlaying = false;
        this.updatePlayPauseButton(false);
        await this.loadCurrentSurah();
    }
    
    updateProgress() {
        if (!this.quranAudio) return;
        
        const progressFill = document.getElementById('progressFill');
        const currentTimeElement = document.getElementById('quranCurrentTime');
        
        if (progressFill && this.quranAudio.duration) {
            const progress = (this.quranAudio.currentTime / this.quranAudio.duration) * 100;
            progressFill.style.width = progress + '%';
        }
        
        if (currentTimeElement) {
            currentTimeElement.textContent = this.formatTime(this.quranAudio.currentTime);
        }
    }
    
    updateTimeDisplay() {
        if (!this.quranAudio) return;
        
        const totalTimeElement = document.getElementById('totalTime');
        if (totalTimeElement && this.quranAudio.duration) {
            totalTimeElement.textContent = this.formatTime(this.quranAudio.duration);
        }
    }
    
    seekAudio(event) {
        if (!this.quranAudio || !this.quranAudio.duration) return;
        
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        
        this.quranAudio.currentTime = percentage * this.quranAudio.duration;
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Handle extension installation
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onInstalled.addListener(() => {
        // Set default settings
        chrome.storage.local.set({
            autoRotateWallpaper: true,
            autoRefreshVerse: true,
            showIslamicCalendar: true,
            currentWallpaperIndex: 0
        });
    });
}

// Initialize the homepage when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const homepage = new IslamicHomepage();
    homepage.loadSettings();
});