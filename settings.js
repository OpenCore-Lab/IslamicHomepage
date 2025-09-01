// Settings Page Script
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            wallpaperRotation: true,
            rotationInterval: 1,
            verseRotationType: 'automatic',
            verseInterval: 30,
            verseTranslation: 'en',
            clockFormat: '12',
            showIslamicCalendar: true,
            fontSize: 'medium',
            overlayOpacity: 0.3,
            enablePrayerTimes: false,
            prayerLocation: ''
        };
        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateOpacityDisplay();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(this.defaultSettings);
            
            // Apply loaded settings to form elements
            Object.keys(result).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = result[key];
                    } else if (element.type === 'range') {
                        element.value = result[key];
                    } else {
                        element.value = result[key];
                    }
                }
            });
            
            // Handle prayer times visibility
            this.togglePrayerTimesSettings(result.enablePrayerTimes);
            
            // Handle verse interval visibility
            this.toggleVerseIntervalSetting();
            
            // Update opacity display
            this.updateOpacityDisplay();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showMessage('Error loading settings', 'error');
        }
    }

    saveSettings() {
        const settings = {
            wallpaperRotation: document.getElementById('wallpaperRotation').checked,
            rotationInterval: parseInt(document.getElementById('rotationInterval').value),
            verseRotationType: document.getElementById('verseRotationType').value,
            verseInterval: parseInt(document.getElementById('verseInterval').value),
            verseTranslation: document.getElementById('verseTranslation').value,
            clockFormat: document.getElementById('clockFormat').value,
            showIslamicCalendar: document.getElementById('showIslamicCalendar').checked,
            fontSize: document.getElementById('fontSize').value,
            overlayOpacity: parseFloat(document.getElementById('overlayOpacity').value)
        };

        // Add prayer times settings if they exist
        const enablePrayerTimes = document.getElementById('enablePrayerTimes');
        const prayerLocation = document.getElementById('prayerLocation');
        if (enablePrayerTimes && prayerLocation) {
            settings.enablePrayerTimes = enablePrayerTimes.checked;
            settings.prayerLocation = prayerLocation.value;
        }

        chrome.storage.local.set(settings, () => {
            this.showMessage('Settings saved successfully!');
            this.notifyHomepage();
        });
    }

    async resetSettings() {
        try {
            // Clear storage and set defaults
            await chrome.storage.local.clear();
            await chrome.storage.local.set(this.defaultSettings);
            
            // Reload the page to reflect changes
            location.reload();
            
        } catch (error) {
            console.error('Error resetting settings:', error);
            this.showMessage('Error resetting settings', 'error');
        }
    }

    setupEventListeners() {
        // Save button
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset button
        document.getElementById('resetSettings').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all settings to default?')) {
                this.resetSettings();
            }
        });

        // Wallpaper settings
        document.getElementById('wallpaperRotation').addEventListener('change', () => this.saveSettings());
        document.getElementById('rotationInterval').addEventListener('change', () => this.saveSettings());
        
        // Verse settings
        document.getElementById('verseRotationType').addEventListener('change', () => {
            this.toggleVerseIntervalSetting();
            this.saveSettings();
        });
        document.getElementById('verseInterval').addEventListener('change', () => this.saveSettings());
        document.getElementById('verseTranslation').addEventListener('change', () => this.saveSettings());
        
        // Time & Date settings
        document.getElementById('clockFormat').addEventListener('change', () => this.saveSettings());
        document.getElementById('showIslamicCalendar').addEventListener('change', () => this.saveSettings());
        
        // Display settings
        document.getElementById('fontSize').addEventListener('change', () => this.saveSettings());
        document.getElementById('overlayOpacity').addEventListener('input', () => {
            this.updateOpacityDisplay();
            this.saveSettings();
        });
        
        // Prayer times settings
        document.getElementById('enablePrayerTimes').addEventListener('change', (e) => {
            this.togglePrayerTimesSettings(e.target.checked);
            this.saveSettings();
        });
        document.getElementById('prayerLocation').addEventListener('input', () => this.saveSettings());
    }

    updateOpacityDisplay() {
        const slider = document.getElementById('overlayOpacity');
        const display = document.getElementById('opacityValue');
        if (slider && display) {
            display.textContent = slider.value + '%';
        }
    }

    togglePrayerTimesSettings(show) {
        const locationSettings = document.querySelector('.location-settings');
        if (locationSettings) {
            locationSettings.style.display = show ? 'block' : 'none';
        }
    }

    toggleVerseIntervalSetting() {
        const verseRotationType = document.getElementById('verseRotationType');
        const verseIntervalSetting = document.getElementById('verseIntervalSetting');
        if (verseRotationType && verseIntervalSetting) {
            verseIntervalSetting.style.display = verseRotationType.value === 'automatic' ? 'block' : 'none';
        }
    }

    showMessage(message, type = 'success') {
        // Remove existing message
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = message;

        // Insert at the top of settings container
        const container = document.querySelector('.settings-container');
        const header = container.querySelector('.header');
        container.insertBefore(messageDiv, header.nextSibling);

        // Show message with animation
        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 100);

        // Hide message after 3 seconds
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, 3000);
    }

    notifyHomepageUpdate() {
        // Send message to all tabs to update settings
        if (chrome.tabs) {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.url && (tab.url.includes('chrome://newtab/') || tab.url.includes('homepage.html'))) {
                        chrome.tabs.sendMessage(tab.id, { action: 'updateSettings' }, () => {
                            // Ignore errors for tabs that don't have content script
                            chrome.runtime.lastError;
                        });
                    }
                });
            });
        }
    }

    // Wallpaper preview functionality
    previewWallpaper(collection) {
        const wallpaperCollections = {
            islamic: [
                'https://images.unsplash.com/photo-1564769625392-651b2c2d2c5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
            ],
            nature: [
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
            ],
            calligraphy: [
                'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
            ],
            mixed: [
                'https://images.unsplash.com/photo-1564769625392-651b2c2d2c5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
                'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
            ]
        };

        return wallpaperCollections[collection] || wallpaperCollections.islamic;
    }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const settingsManager = new SettingsManager();
    
    // Add wallpaper collection preview
    const wallpaperSelect = document.getElementById('wallpaperCollection');
    if (wallpaperSelect) {
        wallpaperSelect.addEventListener('change', (e) => {
            const collection = e.target.value;
            const previews = settingsManager.previewWallpaper(collection);
            // You could add preview images here if needed
        });
    }
});

// Handle messages from content script
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getSettings') {
            chrome.storage.local.get(null, (result) => {
                sendResponse(result);
            });
            return true; // Keep message channel open for async response
        }
    });
}