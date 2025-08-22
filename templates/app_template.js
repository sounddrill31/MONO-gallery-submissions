// Photography Contest Gallery - MONO Design System
// Enhanced with Stats Modal, Team Details, Drag-to-Zoom, and Blurred Previews
// Enhanced with Optimized Image Loading Queue (Max 6 concurrent loads)

class ImageCache {
    constructor() {
        this.cache = new Map(); // Shared cache across all instances
        this.loadingPromises = new Map(); // Track ongoing loads to prevent duplicates
    }

    get(url) {
        return this.cache.get(url);
    }

    set(url, imageElement) {
        this.cache.set(url, imageElement);
    }

    has(url) {
        return this.cache.has(url);
    }

    isLoading(url) {
        return this.loadingPromises.has(url);
    }

    setLoadingPromise(url, promise) {
        this.loadingPromises.set(url, promise);
        promise.finally(() => this.loadingPromises.delete(url));
    }

    getLoadingPromise(url) {
        return this.loadingPromises.get(url);
    }
}

// Global shared cache instance
const globalImageCache = new ImageCache();

class PreloadQueue {
    constructor(maxConcurrent = 6) {
        this.maxConcurrent = maxConcurrent;
        this.queue = []; // { url, priority, resolve, reject }
        this.activeLoads = 0;
        this.cache = globalImageCache; // Use shared cache
    }

    add(imageUrl, priority = 0) {
        return new Promise((resolve, reject) => {
            // If already cached, return immediately
            if (this.cache.has(imageUrl)) {
                resolve(this.cache.get(imageUrl));
                return;
            }

            // If already loading, return the existing promise
            if (this.cache.isLoading(imageUrl)) {
                this.cache.getLoadingPromise(imageUrl).then(resolve).catch(reject);
                return;
            }

            // Add to queue with priority (higher priority = loaded first)
            const task = { url: imageUrl, priority, resolve, reject };

            // Insert based on priority (higher priority first)
            let inserted = false;
            for (let i = 0; i < this.queue.length; i++) {
                if (this.queue[i].priority < priority) {
                    this.queue.splice(i, 0, task);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                this.queue.push(task);
            }

            this.processQueue();
        });
    }

    processQueue() {
        while (this.activeLoads < this.maxConcurrent && this.queue.length > 0) {
            const task = this.queue.shift();
            this.loadImage(task);
        }
    }

    loadImage(task) {
        this.activeLoads++;
        const img = new Image();

        // Set high priority for focused images
        if (task.priority >= 100) {
            img.fetchPriority = 'high';
        }

        const loadPromise = new Promise((resolve, reject) => {
            img.onload = () => {
                this.cache.set(task.url, img);
                resolve(img);
            };
            img.onerror = reject;
        });

        // Track loading promise
        this.cache.setLoadingPromise(task.url, loadPromise);

        loadPromise
            .then(img => task.resolve(img))
            .catch(err => task.reject(err))
            .finally(() => {
                this.activeLoads--;
                this.processQueue(); // Continue with next in queue
            });

        img.src = task.url;
    }

    // Force refresh an image (removes from cache and reloads)
    refresh(imageUrl, priority = 100) {
        // Remove from cache to force reload
        this.cache.cache.delete(imageUrl);
        return this.add(imageUrl, priority);
    }

    // Get queue status for debugging
    getStatus() {
        return {
            queueLength: this.queue.length,
            activeLoads: this.activeLoads,
            cacheSize: this.cache.cache.size
        };
    }
}

class GalleryApp {
    constructor() {
        this.teams = {{TEAMS_DATA}};
        this.currentTeam = 1;
        this.currentPhoto = 1;
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.isModalOpen = false;
        this.stats = this.calculateStats();


        // Drag and zoom state
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.imageStartOffsetX = 0;
        this.imageStartOffsetY = 0;

        // Initialize preload queue with 6 concurrent limit
        this.preloadQueue = new PreloadQueue(6);

        // Placeholder/preview image for instant switching
        this.placeholderImage = this.createPlaceholderImage();


        this.init();
    }


    init() {
        this.renderGalleryGrid();
        this.bindEvents();
        this.handleURLParams();
        this.preloadImages();
    }

    createPlaceholderImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');

        // Create a simple loading pattern
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, 200, 200);
        ctx.fillStyle = '#d4d4d4';
        ctx.font = '16px Space Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', 100, 100);

        return canvas.toDataURL();
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


        card.innerHTML = `
            <div class="border-4 ${courseClass} bg-gray-50 hover:bg-gray-100 transition-colors">
                <div class="p-4 border-b border-gray-300">
                    <h3 class="font-bold text-lg">${team.team_name}</h3>
                    <p class="text-sm opacity-70">Team #${team.team_number} • ${team.course}</p>
                </div>


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


        // Team details modal
        document.getElementById('teamInfo').addEventListener('click', () => this.openTeamDetailsModal());
        document.getElementById('closeTeamDetailsModal').addEventListener('click', () => this.closeTeamDetailsModal());


        // Vote button
        document.getElementById('voteBtn').addEventListener('click', () => this.handleVote());


        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));


        // Modal overlay clicks
        document.getElementById('galleryModal').addEventListener('click', (e) => {
            if (e.target.id === 'galleryModal') this.closeModal();
        });


        // Size control events
        document.getElementById('sizeDecreaseBtn').addEventListener('click', () => {
            this.decreaseSize();
        });


        document.getElementById('sizeIncreaseBtn').addEventListener('click', () => {
            this.increaseSize();
        });


        document.getElementById('statsModal').addEventListener('click', (e) => {
            if (e.target.id === 'statsModal') this.closeStatsModal();
        });


        document.getElementById('teamDetailsModal').addEventListener('click', (e) => {
            if (e.target.id === 'teamDetailsModal') this.closeTeamDetailsModal();
        });


        // Drag and zoom events for gallery image
        this.setupDragZoom();
    }


    setupDragZoom() {
        const galleryImage = document.getElementById('galleryImage');


        // Mouse events
        galleryImage.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());


        // Wheel zoom
        galleryImage.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });


        // Touch events for mobile
        galleryImage.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        galleryImage.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        galleryImage.addEventListener('touchend', () => this.handleTouchEnd());


        // Prevent context menu on right click
        galleryImage.addEventListener('contextmenu', (e) => e.preventDefault());
    }


    handleMouseDown(e) {
        if (!this.isModalOpen) return;


        e.preventDefault();
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.imageStartOffsetX = this.imageOffsetX;
        this.imageStartOffsetY = this.imageOffsetY;


        const galleryImage = document.getElementById('galleryImage');
        galleryImage.classList.add('dragging');


        this.showZoomHint();
    }


    handleMouseMove(e) {
        if (!this.isDragging || !this.isModalOpen) return;


        e.preventDefault();
        const deltaX = e.clientX - this.dragStartX;
        const deltaY = e.clientY - this.dragStartY;


        this.imageOffsetX = this.imageStartOffsetX + deltaX;
        this.imageOffsetY = this.imageStartOffsetY + deltaY;


        this.applyImageTransform();
    }


    handleMouseUp() {
        if (!this.isDragging) return;


        this.isDragging = false;
        const galleryImage = document.getElementById('galleryImage');
        galleryImage.classList.remove('dragging');


        this.hideZoomHint();
    }


    handleWheel(e) {
        if (!this.isModalOpen) return;


        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        this.currentScale = Math.min(Math.max(this.currentScale + delta, 0.3), 5.0);


        // Reset offset if zooming out to original size
        if (this.currentScale <= 1.0) {
            this.imageOffsetX = 0;
            this.imageOffsetY = 0;
        }


        this.applyImageTransform();
        this.showZoomHint();


        // Hide hint after delay
        clearTimeout(this.zoomHintTimeout);
        this.zoomHintTimeout = setTimeout(() => this.hideZoomHint(), 2000);
    }


    handleTouchStart(e) {
        if (!this.isModalOpen) return;


        if (e.touches.length === 1) {
            // Single touch - start dragging
            const touch = e.touches[0];
            this.isDragging = true;
            this.dragStartX = touch.clientX;
            this.dragStartY = touch.clientY;
            this.imageStartOffsetX = this.imageOffsetX;
            this.imageStartOffsetY = this.imageOffsetY;
        } else if (e.touches.length === 2) {
            // Two touches - prepare for pinch zoom
            this.isDragging = false;
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.initialPinchDistance = this.getDistance(touch1, touch2);
            this.initialScale = this.currentScale;
        }
    }


    handleTouchMove(e) {
        if (!this.isModalOpen) return;


        e.preventDefault();


        if (e.touches.length === 1 && this.isDragging) {
            // Single touch - drag
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.dragStartX;
            const deltaY = touch.clientY - this.dragStartY;


            this.imageOffsetX = this.imageStartOffsetX + deltaX;
            this.imageOffsetY = this.imageStartOffsetY + deltaY;


            this.applyImageTransform();
        } else if (e.touches.length === 2) {
            // Two touches - pinch zoom
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = this.getDistance(touch1, touch2);
            const scale = (distance / this.initialPinchDistance) * this.initialScale;


            this.currentScale = Math.min(Math.max(scale, 0.3), 5.0);


            // Reset offset if zooming out to original size
            if (this.currentScale <= 1.0) {
                this.imageOffsetX = 0;
                this.imageOffsetY = 0;
            }


            this.applyImageTransform();
        }
    }


    handleTouchEnd() {
        this.isDragging = false;
    }


    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }


    increaseSize() {
        this.currentScale = Math.min(this.currentScale + 0.2, 5.0);
        this.applyImageTransform();
        this.showZoomHint();
        clearTimeout(this.zoomHintTimeout);
        this.zoomHintTimeout = setTimeout(() => this.hideZoomHint(), 2000);
    }


    decreaseSize() {
        this.currentScale = Math.max(this.currentScale - 0.2, 0.3);
        if (this.currentScale <= 1.0) {
            this.imageOffsetX = 0;
            this.imageOffsetY = 0;
        }
        this.applyImageTransform();
        this.showZoomHint();
        clearTimeout(this.zoomHintTimeout);
        this.zoomHintTimeout = setTimeout(() => this.hideZoomHint(), 2000);
    }


    applyImageTransform() {
        const image = document.getElementById('galleryImage');
        if (image) {
            let transform = `scale(${this.currentScale}) translate(${this.imageOffsetX / this.currentScale}px, ${this.imageOffsetY / this.currentScale}px)`;
            if (this.currentRotation !== 0) {
                transform += ` rotate(${this.currentRotation}deg)`;
            }
            image.style.transform = transform;
        }
    }


    showZoomHint() {
        let hint = document.querySelector('.zoom-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'zoom-hint';
            hint.innerHTML = `Zoom: ${Math.round(this.currentScale * 100)}% • Scroll to zoom • Drag to pan`;
            document.body.appendChild(hint);
        } else {
            hint.innerHTML = `Zoom: ${Math.round(this.currentScale * 100)}% • Scroll to zoom • Drag to pan`;
        }


        clearTimeout(hint.hideTimeout);
        hint.classList.add('show');
    }


    hideZoomHint() {
        const hint = document.querySelector('.zoom-hint');
        if (hint) {
            hint.classList.remove('show');
            hint.hideTimeout = setTimeout(() => {
                if (hint.parentNode) {
                    document.body.removeChild(hint);
                }
            }, 300);
        }
    }


    setupTouchGestures() {
        // This method is now handled by setupDragZoom()
        // Kept for compatibility
    }


    openGallery(teamNumber, photoNumber) {
        this.currentTeam = teamNumber;
        this.currentPhoto = photoNumber;
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;


        this.showModal('gallery');
        this.updateImage();
        this.updateURL();
        this.showKeyboardHint();
    }


    openStatsModal() {
        this.showModal('stats');
        this.renderStats();
    }


    openTeamDetailsModal() {
        if (!this.isModalOpen) return;


        const team = this.teams.find(t => t.team_number === this.currentTeam);
        if (team) {
            this.showModal('teamDetails');
            this.renderTeamDetails(team);
        }
    }


    showModal(type) {
        const modals = ['gallery', 'stats', 'teamDetails'];


        // Close all modals first
        modals.forEach(modalType => {
            const modal = document.getElementById(`${modalType}Modal`);
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
            }
        });


        // Show requested modal
        const targetModal = document.getElementById(`${type}Modal`);
        if (targetModal) {
            targetModal.classList.remove('hidden');
            targetModal.classList.add('show');
            document.body.style.overflow = 'hidden';


            if (type === 'gallery') {
                this.isModalOpen = true;
            }
        }
    }


    closeModal() {
        this.closeAllModals();
        this.isModalOpen = false;
        window.history.pushState({}, '', window.location.pathname);
        this.hideKeyboardHint();
        this.hideZoomHint();


        // Reset image state
        this.currentScale = 1.0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.currentRotation = 0;
    }


    closeStatsModal() {
        this.closeAllModals();
    }


    closeTeamDetailsModal() {
        this.closeAllModals();
        if (this.isModalOpen) {
            // Return to gallery modal if it was open
            this.showModal('gallery');
        }
    }


    closeAllModals() {
        const modals = ['galleryModal', 'statsModal', 'teamDetailsModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
            }
        });
        document.body.style.overflow = 'auto';
    }


    updateImage() {
        const team = this.teams.find(t => t.team_number === this.currentTeam);
        if (!team) return;


        const imageUrl = team.images[this.currentPhoto - 1];
        const galleryImage = document.getElementById('galleryImage');

        // Show placeholder immediately for instant switching
        galleryImage.src = this.placeholderImage;
        galleryImage.classList.add('loading');
        galleryImage.alt = `${team.team_name} - Photo ${this.currentPhoto}`;

        // Refresh the current image (force reload) with maximum priority
        this.preloadQueue.refresh(imageUrl, 200).then(loadedImg => {
            if (this.isModalOpen && 
                this.currentTeam === team.team_number && 
                this.currentPhoto === this.currentPhoto) {
                galleryImage.src = loadedImg.src;
                galleryImage.classList.remove('loading');
            }
        }).catch(() => {
            galleryImage.src = this.placeholderImage;
            galleryImage.classList.remove('loading');
        });


        // Reset transform states
        this.currentScale = 1.0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
        this.currentRotation = 0;
        galleryImage.style.transform = '';


        // Update team info
        this.updateTeamInfo(team);

        // Preload adjacent images with high priority
        this.preloadAdjacentImages();
    }

    preloadAdjacentImages() {
        const team = this.teams.find(t => t.team_number === this.currentTeam);
        if (!team || !team.images) return;

        const adjacentIndices = [
            this.currentPhoto - 2, // Previous
            this.currentPhoto,     // Next
        ].filter(index => index >= 0 && index < team.images.length);

        adjacentIndices.forEach(index => {
            const imageUrl = team.images[index];
            if (imageUrl) {
                this.preloadQueue.add(imageUrl, 80);
            }
        });
    }


    updateTeamInfo(team) {
        document.getElementById('teamName').textContent = team.team_name;
        document.getElementById('teamDetails').textContent = 
            `Team #${team.team_number} • ${team.course} ${team.batch} • Semester ${team.semester}`;
        document.getElementById('teamMembers').textContent = 
            `Members: ${team.members.join(', ')}`;
        document.getElementById('teamContact').textContent = 
            `Contact: ${team.contact}`;
    }


    renderStats() {
        const content = document.getElementById('statsContent');


        content.innerHTML = `
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
                <div class="stat-card">
                    <span class="stat-number">88</span>
                    <span class="stat-label">Total Photos</span>
                </div>
            </div>


            <h3 class="text-xl font-bold mb-4">Course Distribution</h3>
            <div class="space-y-3">
                ${Object.entries(this.stats.courseDistribution).map(([course, count]) => {
                    const percentage = (count / this.stats.totalTeams * 100).toFixed(1);
                    return `
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="font-bold">${course}</span>
                                <span>${count} teams (${percentage}%)</span>
                            </div>
                            <div class="course-bar">
                                <div class="course-bar-fill" style="width: ${percentage}%">
                                    ${count}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>


            <h3 class="text-xl font-bold mb-4 mt-8">Semester Distribution</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                ${Object.entries(this.stats.semesterDistribution).map(([semester, count]) => `
                    <div class="stat-card">
                        <span class="stat-number">${count}</span>
                        <span class="stat-label">Semester ${semester}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }


    renderTeamDetails(team) {
        const content = document.getElementById('teamDetailsContent');
        const title = document.getElementById('teamDetailsTitle');


        title.textContent = `${team.team_name} (#${team.team_number})`;


        content.innerHTML = `
            <table class="team-details-table">
                <tr>
                    <th>Team Name</th>
                    <td>${team.team_name}</td>
                </tr>
                <tr>
                    <th>Team Number</th>
                    <td>#${team.team_number}</td>
                </tr>
                <tr>
                    <th>Course</th>
                    <td>${team.course} (Batch ${team.batch})</td>
                </tr>
                <tr>
                    <th>Semester</th>
                    <td>${team.semester}</td>
                </tr>
                <tr>
                    <th>Members</th>
                    <td>${team.members.join('<br>')}</td>
                </tr>
                <tr>
                    <th>Contact</th>
                    <td><a href="tel:${team.contact}" class="underline hover:no-underline">${team.contact}</a></td>
                </tr>
                <tr>
                    <th>Submission Time</th>
                    <td>${team.upload_time}</td>
                </tr>
                ${team.notes ? `
                <tr>
                    <th>Notes</th>
                    <td>${team.notes}</td>
                </tr>
                ` : ''}
            </table>


            <div class="mt-6">
                <h4 class="font-bold mb-3">Submitted Photos</h4>
                <div class="grid grid-cols-2 gap-2">
                    ${team.images.map((img, index) => `
                        <div class="relative">
                            <img src="${img}" 
                                 alt="Photo ${index + 1}"
                                 class="w-full aspect-square object-cover border border-gray-300 cursor-pointer hover:opacity-80"
                                 onclick="window.galleryApp.closeTeamDetailsModal(); window.galleryApp.openGallery(${team.team_number}, ${index + 1});">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }


    navigateImage(direction) {
        this.currentPhoto += direction;


        // If we go beyond current team's images, switch to next/previous team
        if (this.currentPhoto > 4) {
            this.navigateTeam(1);
            this.currentPhoto = 1;
        } else if (this.currentPhoto < 1) {
            this.navigateTeam(-1);
            this.currentPhoto = 4;
        }


        this.updateImage();
        this.updateURL();
    }


    navigateTeam(direction) {
        const teamNumbers = this.teams.map(t => t.team_number).sort((a, b) => a - b);
        const currentIndex = teamNumbers.indexOf(this.currentTeam);
        let newIndex = currentIndex + direction;


        // Wrap around
        if (newIndex >= teamNumbers.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = teamNumbers.length - 1;
        }


        this.currentTeam = teamNumbers[newIndex];
    }


    rotateImage(degrees) {
        this.currentRotation = (this.currentRotation + degrees) % 360;
        if (this.currentRotation < 0) this.currentRotation += 360;
        this.applyImageTransform();
    }


    handleKeyboard(e) {
        if (!this.isModalOpen) return;


        switch(e.key) {
            case 'Escape':
                this.closeModal();
                break;
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
                this.updateImage();
                this.updateURL();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateTeam(1);
                this.updateImage();
                this.updateURL();
                break;
            case 'r':
            case 'R':
                e.preventDefault();
                this.rotateImage(90);
                break;
            case 'l':
            case 'L':
                e.preventDefault();
                this.rotateImage(-90);
                break;
            case 'i':
            case 'I':
                e.preventDefault();
                this.openTeamDetailsModal();
                break;
            case '=':
            case '+':
                e.preventDefault();
                this.increaseSize();
                break;
            case '-':
                e.preventDefault();
                this.decreaseSize();
                break;
            case '0':
                e.preventDefault();
                this.currentScale = 1.0;
                this.imageOffsetX = 0;
                this.imageOffsetY = 0;
                this.applyImageTransform();
                this.showZoomHint();
                clearTimeout(this.zoomHintTimeout);
                this.zoomHintTimeout = setTimeout(() => this.hideZoomHint(), 2000);
                break;
        }
    }


    updateURL() {
        const params = new URLSearchParams();
        params.set('team', this.currentTeam);
        params.set('photo', this.currentPhoto);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }


    handleURLParams() {
        const params = new URLSearchParams(window.location.search);
        const team = parseInt(params.get('team'));
        const photo = parseInt(params.get('photo'));


        if (team && photo) {
            setTimeout(() => {
                this.openGallery(team, photo);
            }, 100);
        }
    }


    preloadImages() {
        // Preload first few team images with lower priority
        this.teams.slice(0, 5).forEach((team, teamIndex) => {
            if (team.images && team.images.length > 0) {
                team.images.forEach((imageUrl, photoIndex) => {
                    // First team's first photo gets higher priority
                    const priority = (teamIndex === 0 && photoIndex === 0) ? 50 : 10;
                    this.preloadQueue.add(imageUrl, priority);
                });
            }
        });
    }


    showKeyboardHint() {
        const hint = this.createKeyboardHint();
        document.body.appendChild(hint);


        setTimeout(() => hint.classList.add('show'), 100);
        setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => {
                if (hint.parentNode) {
                    document.body.removeChild(hint);
                }
            }, 300);
        }, 4000);
    }


    createKeyboardHint() {
        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        hint.innerHTML = 'Arrow keys: navigate • +/-/0: zoom • Drag/Scroll: pan/zoom • R/L: rotate • I: team info • ESC: close';
        return hint;
    }


    hideKeyboardHint() {
        const hints = document.querySelectorAll('.keyboard-hint');
        hints.forEach(hint => {
            hint.classList.remove('show');
            setTimeout(() => {
                if (hint.parentNode) {
                    hint.parentNode.removeChild(hint);
                }
            }, 300);
        });
    }


    handleVote() {
        // Open voting popup (currently hidden)
        window.open('https://google.com', '_blank', 'width=800,height=600');
    }

    // Debug method to check queue status
    getQueueStatus() {
        return this.preloadQueue.getStatus();
    }
}


// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galleryApp = new GalleryApp();

    // Debug: expose queue status to console
    window.queueStatus = () => window.galleryApp.getQueueStatus();
});


// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    if (window.galleryApp) {
        window.galleryApp.handleURLParams();
    }
});