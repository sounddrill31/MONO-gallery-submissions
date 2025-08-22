// Photography Contest Gallery - MONO Design System
// Enhanced with Stats Modal, Team Details, Drag-to-Zoom, and Optimized Image Loading

class GalleryApp {
    constructor() {
        this.teams = {{TEAMS_DATA}};
        this.currentTeam = 1;
        this.currentPhoto = 1;
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.isModalOpen = false;
        this.isTeamInfoVisible = false;
        this.stats = this.calculateStats();

        // Image loading queue management (max 6 images in RAM)
        this.imageCache = new Map();
        this.maxCacheSize = 6;
        this.preloadQueue = [];

        // Drag and zoom state
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.imageStartOffsetX = 0;
        this.imageStartOffsetY = 0;

        this.init();
    }

    init() {
        this.renderGalleryGrid();
        this.bindEvents();
        this.handleURLParams();
        this.preloadImages();
    }

    calculateStats() {
        const courseCount = {};
        const batchCount = {};
        const semesterCount = {};
        let totalMembers = 0;

        this.teams.forEach(team => {
            // Course distribution
            courseCount[team.course] = (courseCount[team.course] || 0) + 1;

            // Batch distribution
            batchCount[team.batch] = (batchCount[team.batch] || 0) + 1;

            // Semester distribution
            semesterCount[team.semester] = (semesterCount[team.semester] || 0) + 1;

            // Total members
            totalMembers += team.members.length;
        });

        return {
            totalTeams: this.teams.length,
            totalMembers,
            courseDistribution: courseCount,
            batchDistribution: batchCount,
            semesterDistribution: semesterCount,
            averageTeamSize: (totalMembers / this.teams.length).toFixed(1)
        };
    }

    // Generate blurred/low-res version of image URL
    generatePreviewUrl(originalUrl) {
        // For demonstration, we'll use a blur parameter if the image service supports it
        // In real implementation, you might want to generate actual thumbnails
        return originalUrl + (originalUrl.includes('?') ? '&' : '?') + 'blur=2&w=150&h=150&q=30';
    }

    // Enhanced image cache management - only keep 6 images max, prioritize current
    manageImageCache(priorityUrl, nearbyUrls = []) {
        // Always keep priority URL first
        const urlsToCache = [priorityUrl, ...nearbyUrls.filter(url => url !== priorityUrl)];
        
        // Remove excess images from cache
        if (this.imageCache.size >= this.maxCacheSize) {
            const cacheKeys = Array.from(this.imageCache.keys());
            // Remove least recently used images not in current priority list
            cacheKeys.forEach(key => {
                if (!urlsToCache.includes(key) && this.imageCache.size > 3) {
                    this.imageCache.delete(key);
                }
            });
        }

        // Preload priority images
        urlsToCache.slice(0, this.maxCacheSize).forEach(url => {
            if (url && !this.imageCache.has(url)) {
                const img = new Image();
                img.onload = () => {
                    this.imageCache.set(url, img);
                };
                img.onerror = () => {
                    console.warn('Failed to load image:', url);
                };
                img.src = url;
            }
        });
    }

    renderGalleryGrid() {
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        this.teams.forEach(team => {
            const teamCard = this.createTeamCard(team);
            grid.appendChild(teamCard);
        });
    }

    createTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'team-card';

        const courseClass = `course-${team.course.toLowerCase()}`;

        // Ensure team name is always visible on the home screen
        card.innerHTML = `
            <div class="border-4 ${courseClass} bg-gray-50 hover:bg-gray-100 transition-colors">
                <!-- Team Name Header - Always Visible -->
                <div class="p-4 border-b border-gray-300 bg-white">
                    <h3 class="font-bold text-lg text-center whitespace-nowrap overflow-hidden text-ellipsis">${team.team_name}</h3>
                    <p class="text-sm opacity-70 text-center">Team #${team.team_number} • ${team.course}</p>
                    <p class="text-xs mt-1 opacity-60 text-center whitespace-nowrap overflow-hidden text-ellipsis">${team.members.join(', ')}</p>
                </div>

                <!-- Image Grid -->
                <div class="grid grid-cols-2 gap-1 p-2">
                    ${team.images.map((img, index) => {
                        const previewUrl = this.generatePreviewUrl(img);
                        return `
                        <div class="relative">
                            <img src="${previewUrl}" 
                                 data-full-src="${img}"
                                 alt="${team.team_name} Photo ${index + 1}"
                                 class="image-preview w-full cursor-pointer hover:opacity-80 transition-opacity"
                                 onclick="window.galleryApp.openGallery(${team.team_number}, ${index + 1})"
                                 loading="lazy"
                                 onload="this.classList.add('loaded')"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPiA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg=='; this.classList.add('loaded')">
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
        `;

        return card;
    }

    bindEvents() {
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('prevBtn').addEventListener('click', () => this.navigateImage(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigateImage(1));
        document.getElementById('rotateLeftBtn').addEventListener('click', () => this.rotateImage(-90));
        document.getElementById('rotateRightBtn').addEventListener('click', () => this.rotateImage(90));

        // Stats modal
        document.getElementById('statsBtn').addEventListener('click', () => this.openStatsModal());
        document.getElementById('closeStatsModal').addEventListener('click', () => this.closeStatsModal());

        // Team details modal - Updated to handle proper stacking
        document.getElementById('teamInfo').addEventListener('click', () => {
            this.isTeamInfoVisible = false; // Hide current team info
            this.updateTeamInfoVisibility();
            this.openTeamDetailsModal();
        });
        document.getElementById('closeTeamDetailsModal').addEventListener('click', () => this.closeTeamDetailsModal());

        // Size controls
        document.getElementById('sizeIncreaseBtn').addEventListener('click', () => this.increaseSize());
        document.getElementById('sizeDecreaseBtn').addEventListener('click', () => this.decreaseSize());

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Setup drag and zoom for gallery image
        this.setupDragZoom();
        this.setupTouchGestures();

        // Vote button
        document.getElementById('voteBtn').addEventListener('click', () => this.handleVote());

        // ESC key to close all modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Enhanced click outside modal to close and manage team info stacking
        document.getElementById('galleryModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                // If team details modal is open, close it and show team info
                if (!document.getElementById('teamDetailsModal').classList.contains('hidden')) {
                    this.closeTeamDetailsModal();
                    this.isTeamInfoVisible = true;
                    this.updateTeamInfoVisibility();
                } else if (this.isTeamInfoVisible) {
                    // If team info is visible, hide it and show image
                    this.isTeamInfoVisible = false;
                    this.updateTeamInfoVisibility();
                } else {
                    // Close modal entirely
                    this.closeModal();
                }
            }
        });

        document.getElementById('statsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeStatsModal();
            }
        });

        document.getElementById('teamDetailsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeTeamDetailsModal();
            }
        });
    }

    // New method to manage team info visibility and stacking
    updateTeamInfoVisibility() {
        const teamInfo = document.getElementById('teamInfo');
        const galleryImage = document.getElementById('galleryImage');
        
        if (this.isTeamInfoVisible) {
            teamInfo.style.zIndex = '100';
            teamInfo.style.opacity = '1';
            galleryImage.style.zIndex = '1';
        } else {
            teamInfo.style.zIndex = '10';
            teamInfo.style.opacity = '0.8';
            galleryImage.style.zIndex = '5';
        }
    }

    setupDragZoom() {
        const galleryImage = document.getElementById('galleryImage');

        // Mouse events
        galleryImage.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
        galleryImage.addEventListener('wheel', (e) => this.handleWheel(e));

        // Touch events
        galleryImage.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        document.addEventListener('touchend', () => this.handleTouchEnd());
    }

    handleMouseDown(e) {
        if (e.button === 0) { // Left mouse button
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.imageStartOffsetX = this.imageOffsetX;
            this.imageStartOffsetY = this.imageOffsetY;
            
            const galleryImage = document.getElementById('galleryImage');
            galleryImage.classList.add('dragging');
            e.preventDefault();
        }
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            this.imageOffsetX = this.imageStartOffsetX + deltaX;
            this.imageOffsetY = this.imageStartOffsetY + deltaY;
            
            this.applyImageTransform();
            this.showZoomHint();
        }
    }

    handleMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            const galleryImage = document.getElementById('galleryImage');
            galleryImage.classList.remove('dragging');
            this.hideZoomHint();
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
        
        this.currentScale = Math.max(0.5, Math.min(3.0, this.currentScale + delta));
        this.applyImageTransform();
        this.showZoomHint();
        
        // Hide hint after delay
        clearTimeout(this.zoomHintTimeout);
        this.zoomHintTimeout = setTimeout(() => this.hideZoomHint(), 1500);
    }

    // Touch handling for mobile
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            // Single touch - start drag
            this.isDragging = true;
            this.dragStartX = e.touches[0].clientX;
            this.dragStartY = e.touches[0].clientY;
            this.imageStartOffsetX = this.imageOffsetX;
            this.imageStartOffsetY = this.imageOffsetY;
        } else if (e.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            this.isDragging = false;
            this.pinchStartDistance = this.getDistance(e.touches[0], e.touches[1]);
            this.pinchStartScale = this.currentScale;
        }
        e.preventDefault();
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && this.isDragging) {
            // Single touch drag
            const deltaX = e.touches[0].clientX - this.dragStartX;
            const deltaY = e.touches[0].clientY - this.dragStartY;
            
            this.imageOffsetX = this.imageStartOffsetX + deltaX;
            this.imageOffsetY = this.imageStartOffsetY + deltaY;
            
            this.applyImageTransform();
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
            const scaleChange = currentDistance / this.pinchStartDistance;
            
            this.currentScale = Math.max(0.5, Math.min(3.0, this.pinchStartScale * scaleChange));
            this.applyImageTransform();
        }
        e.preventDefault();
    }

    handleTouchEnd() {
        this.isDragging = false;
    }

    getDistance(touch1, touch2) {
        const deltaX = touch2.clientX - touch1.clientX;
        const deltaY = touch2.clientY - touch1.clientY;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    increaseSize() {
        this.currentScale = Math.min(3.0, this.currentScale + 0.2);
        this.applyImageTransform();
    }

    decreaseSize() {
        this.currentScale = Math.max(0.5, this.currentScale - 0.2);
        this.applyImageTransform();
    }

    applyImageTransform() {
        const galleryImage = document.getElementById('galleryImage');
        if (galleryImage) {
            let transform = `translate(${this.imageOffsetX}px, ${this.imageOffsetY}px) scale(${this.currentScale})`;
            if (this.currentRotation !== 0) {
                transform += ` rotate(${this.currentRotation}deg)`;
            }
            galleryImage.style.transform = transform;
        }
    }

    showZoomHint() {
        let hint = document.querySelector('.zoom-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'zoom-hint';
            hint.textContent = 'Drag to pan • Scroll to zoom • Touch: drag or pinch';
            document.body.appendChild(hint);
        }
        hint.classList.add('show');
    }

    hideZoomHint() {
        const hint = document.querySelector('.zoom-hint');
        if (hint) {
            hint.classList.remove('show');
        }
    }

    setupTouchGestures() {
        // Additional touch gesture setup if needed
        const galleryImage = document.getElementById('galleryImage');
        galleryImage.style.touchAction = 'none'; // Prevent default touch behaviors
    }

    openGallery(teamNumber, photoNumber) {
        this.currentTeam = teamNumber;
        this.currentPhoto = photoNumber;
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.isTeamInfoVisible = true; // Show team info by default
        
        this.showModal('galleryModal');
        this.updateImage();
        this.updateTeamInfo();
        this.updateTeamInfoVisibility();
        this.showKeyboardHint();
        
        // Focus management for better image loading
        this.optimizeImageLoading();
    }

    // Optimize image loading around current image
    optimizeImageLoading() {
        const currentTeamData = this.teams.find(t => t.team_number === this.currentTeam);
        if (!currentTeamData) return;
        
        const currentImageUrl = currentTeamData.images[this.currentPhoto - 1];
        
        // Get nearby images for preloading
        const nearbyUrls = [];
        
        // Add other images from same team
        currentTeamData.images.forEach((url, index) => {
            if (index !== this.currentPhoto - 1) {
                nearbyUrls.push(url);
            }
        });
        
        // Add images from adjacent teams
        const currentTeamIndex = this.teams.findIndex(t => t.team_number === this.currentTeam);
        if (currentTeamIndex > 0) {
            this.teams[currentTeamIndex - 1].images.slice(0, 2).forEach(url => nearbyUrls.push(url));
        }
        if (currentTeamIndex < this.teams.length - 1) {
            this.teams[currentTeamIndex + 1].images.slice(0, 2).forEach(url => nearbyUrls.push(url));
        }
        
        // Manage cache with priority on current image
        this.manageImageCache(currentImageUrl, nearbyUrls);
    }

    openStatsModal() {
        this.showModal('statsModal');
        this.renderStats();
    }

    openTeamDetailsModal() {
        const teamData = this.teams.find(t => t.team_number === this.currentTeam);
        if (teamData) {
            this.showModal('teamDetailsModal');
            this.renderTeamDetails(teamData);
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('show');
            this.isModalOpen = true;
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('galleryModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('show');
            this.isModalOpen = false;
            this.isTeamInfoVisible = false;
            document.body.style.overflow = '';
            this.hideKeyboardHint();
            this.hideZoomHint();
        }
    }

    closeStatsModal() {
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    closeTeamDetailsModal() {
        const modal = document.getElementById('teamDetailsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('show');
            // Return to team info view
            this.isTeamInfoVisible = true;
            this.updateTeamInfoVisibility();
        }
    }

    closeAllModals() {
        this.closeModal();
        this.closeStatsModal();
        this.closeTeamDetailsModal();
    }

    // FORCE REFRESH IMAGE - Always reload image source
    updateImage() {
        const teamData = this.teams.find(t => t.team_number === this.currentTeam);
        if (!teamData || !teamData.images[this.currentPhoto - 1]) return;

        const galleryImage = document.getElementById('galleryImage');
        const imageUrl = teamData.images[this.currentPhoto - 1];
        
        // FORCE REFRESH: Clear src first, then set new one
        galleryImage.removeAttribute('src');
        galleryImage.src = '';
        
        // Force browser to reload by adding timestamp
        const refreshedUrl = imageUrl + (imageUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
        
        setTimeout(() => {
            galleryImage.src = refreshedUrl;
        }, 50);
        
        // Reset transformations
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.applyImageTransform();

        this.updateURL();
    }

    updateTeamInfo() {
        const teamData = this.teams.find(t => t.team_number === this.currentTeam);
        if (!teamData) return;

        document.getElementById('teamName').textContent = teamData.team_name;
        document.getElementById('teamDetails').textContent = `Team #${teamData.team_number} • ${teamData.course} • Photo ${this.currentPhoto}/${teamData.images.length}`;
        document.getElementById('teamMembers').textContent = `Members: ${teamData.members.join(', ')}`;
        document.getElementById('teamContact').textContent = `Contact: ${teamData.contact}`;
    }

    renderStats() {
        const statsContent = document.getElementById('statsContent');
        
        statsContent.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-number">${this.stats.totalTeams}</span>
                    <span class="stat-label">Total Teams</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${this.stats.totalMembers}</span>
                    <span class="stat-label">Total Members</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${this.stats.averageTeamSize}</span>
                    <span class="stat-label">Avg Team Size</span>
                </div>
            </div>

            <div class="mt-6">
                <h3 class="text-lg font-bold mb-4">Course Distribution</h3>
                ${Object.entries(this.stats.courseDistribution).map(([course, count]) => {
                    const percentage = ((count / this.stats.totalTeams) * 100).toFixed(1);
                    return `
                        <div class="course-bar">
                            <div class="course-bar-label">${course}</div>
                            <div class="course-bar-fill" style="width: ${percentage}%">
                                ${count} teams (${percentage}%)
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderTeamDetails(team) {
        document.getElementById('teamDetailsTitle').textContent = `${team.team_name} - Team #${team.team_number}`;
        
        const content = document.getElementById('teamDetailsContent');
        content.innerHTML = `
            <table class="team-details-table">
                <tr><th>Team Name</th><td class="whitespace-nowrap overflow-x-auto text-ellipsis max-w-xs">${team.team_name}</td></tr>
                <tr><th>Team Number</th><td>#${team.team_number}</td></tr>
                <tr><th>Course</th><td>${team.course} (Batch ${team.batch})</td></tr>
                <tr><th>Semester</th><td>${team.semester}</td></tr>
                <tr><th>Members</th><td class="whitespace-nowrap overflow-x-auto text-ellipsis max-w-xs">${team.members.join(', ')}</td></tr>
                <tr><th>Contact</th><td>${team.contact}</td></tr>
                <tr><th>Submission Time</th><td>${team.upload_time}</td></tr>
                <tr><th>Notes</th><td>${team.notes}</td></tr>
                <tr><th>Total Images</th><td>${team.images.length}</td></tr>
            </table>
        `;
    }

    navigateImage(direction) {
        const teamData = this.teams.find(t => t.team_number === this.currentTeam);
        if (!teamData) return;

        const newPhoto = this.currentPhoto + direction;
        if (newPhoto >= 1 && newPhoto <= teamData.images.length) {
            this.currentPhoto = newPhoto;
            this.updateImage(); // This now forces refresh
            this.updateTeamInfo();
            this.optimizeImageLoading(); // Re-optimize loading queue
        }
    }

    navigateTeam(direction) {
        const currentTeamIndex = this.teams.findIndex(t => t.team_number === this.currentTeam);
        const newTeamIndex = currentTeamIndex + direction;
        
        if (newTeamIndex >= 0 && newTeamIndex < this.teams.length) {
            this.currentTeam = this.teams[newTeamIndex].team_number;
            this.currentPhoto = 1;
            this.updateImage();
            this.updateTeamInfo();
            this.optimizeImageLoading();
        }
    }

    rotateImage(degrees) {
        this.currentRotation = (this.currentRotation + degrees) % 360;
        this.applyImageTransform();
    }

    handleKeyboard(e) {
        if (!this.isModalOpen) return;

        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateImage(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateImage(1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateTeam(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateTeam(1);
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                this.rotateImage(90);
                break;
            case '+':
            case '=':
                e.preventDefault();
                this.increaseSize();
                break;
            case '-':
                e.preventDefault();
                this.decreaseSize();
                break;
            case 'i':
            case 'I':
                e.preventDefault();
                this.isTeamInfoVisible = !this.isTeamInfoVisible;
                this.updateTeamInfoVisibility();
                break;
        }
    }

    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('team', this.currentTeam);
        url.searchParams.set('photo', this.currentPhoto);
        window.history.replaceState({}, '', url);
    }

    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const team = urlParams.get('team');
        const photo = urlParams.get('photo');
        
        if (team && photo) {
            this.openGallery(parseInt(team), parseInt(photo));
        }
    }

    preloadImages() {
        // Enhanced preloading - only preload first team's images initially
        const firstTeam = this.teams[0];
        if (firstTeam) {
            this.manageImageCache(firstTeam.images[0], firstTeam.images.slice(1, 4));
        }
    }

    showKeyboardHint() {
        let hint = document.querySelector('.keyboard-hint');
        if (!hint) {
            hint = this.createKeyboardHint();
        }
        hint.classList.add('show');
        
        // Auto-hide after 3 seconds
        setTimeout(() => this.hideKeyboardHint(), 3000);
    }

    createKeyboardHint() {
        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        hint.innerHTML = '← → Navigate Photos • ↑ ↓ Navigate Teams • R Rotate • + - Zoom • I Toggle Info • ESC Close';
        document.body.appendChild(hint);
        return hint;
    }

    hideKeyboardHint() {
        const hint = document.querySelector('.keyboard-hint');
        if (hint) {
            hint.classList.remove('show');
        }
    }

    handleVote() {
        if (this.isModalOpen) {
            alert(`Vote submitted for ${this.teams.find(t => t.team_number === this.currentTeam)?.team_name} - Photo ${this.currentPhoto}`);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galleryApp = new GalleryApp();
});