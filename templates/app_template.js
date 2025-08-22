// Photography Contest Gallery - MONO Design System
// Optimized for performance and efficient image loading

class GalleryApp {
    constructor() {
        this.teams = {{TEAMS_DATA}};
        this.currentTeam = 1;
        this.currentPhoto = 1;
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.isModalOpen = false;
        this.stats = null;

        // Image loading optimization
        this.imageCache = new Map();
        this.preloadedImages = new Set();
        this.loadingQueue = [];

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
        this.calculateStats();
        this.renderGalleryGrid();
        this.bindEvents();
        this.handleURLParams();
        this.preloadCriticalImages();
    }

    calculateStats() {
        if (this.stats) return this.stats;

        const courseCount = {};
        const batchCount = {};
        const semesterCount = {};
        let totalMembers = 0;

        this.teams.forEach(team => {
            courseCount[team.course] = (courseCount[team.course] || 0) + 1;
            batchCount[team.batch] = (batchCount[team.batch] || 0) + 1;
            semesterCount[team.semester] = (semesterCount[team.semester] || 0) + 1;
            totalMembers += team.members.length;
        });

        this.stats = {
            totalTeams: this.teams.length,
            totalMembers,
            courseDistribution: courseCount,
            batchDistribution: batchCount,
            semesterDistribution: semesterCount,
            averageTeamSize: (totalMembers / this.teams.length).toFixed(1)
        };
    }

    // Optimized image loading with cache
    loadImage(url, isPreview = false) {
        if (this.imageCache.has(url)) {
            return Promise.resolve(this.imageCache.get(url));
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.imageCache.set(url, img);
                resolve(img);
            };
            img.onerror = reject;
            
            // Use lower quality for previews
            if (isPreview) {
                img.src = this.generatePreviewUrl(url);
            } else {
                img.src = url;
            }
        });
    }

    generatePreviewUrl(originalUrl) {
        // Simple blur/quality reduction - adjust based on your image service
        if (originalUrl.includes('?')) {
            return originalUrl + '&blur=2&w=200&h=200&q=40';
        }
        return originalUrl + '?blur=2&w=200&h=200&q=40';
    }

    renderGalleryGrid() {
        const grid = document.getElementById('galleryGrid');
        grid.innerHTML = '';

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        this.teams.forEach(team => {
            const teamCard = this.createTeamCard(team);
            fragment.appendChild(teamCard);
        });

        grid.appendChild(fragment);
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
                <div class="grid grid-cols-2 gap-1 p-2" data-team="${team.team_number}">
                    ${team.images.map((img, index) => `
                        <div class="relative">
                            <img data-src="${img}"
                                 alt="${team.team_name} Photo ${index + 1}"
                                 class="image-preview w-full cursor-pointer hover:opacity-80 transition-opacity"
                                 onclick="window.galleryApp.openGallery(${team.team_number}, ${index + 1})"
                                 loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Implement lazy loading for preview images
        this.setupLazyLoading(card, team);

        return card;
    }

    setupLazyLoading(card, team) {
        const images = card.querySelectorAll('.image-preview');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    
                    this.loadImage(src, true).then(() => {
                        img.src = this.generatePreviewUrl(src);
                        img.classList.add('loaded');
                    }).catch(() => {
                        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPiA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                        img.classList.add('loaded');
                    });
                    
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });

        images.forEach(img => observer.observe(img));
    }

    bindEvents() {
        // Use event delegation for better performance
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Modal specific events
        this.setupModalEvents();
        this.setupDragZoom();
    }

    handleGlobalClick(e) {
        const target = e.target;
        
        if (target.id === 'closeModal') this.closeModal();
        else if (target.id === 'prevBtn') this.navigateImage(-1);
        else if (target.id === 'nextBtn') this.navigateImage(1);
        else if (target.id === 'rotateLeftBtn') this.rotateImage(-90);
        else if (target.id === 'rotateRightBtn') this.rotateImage(90);
        else if (target.id === 'statsBtn') this.openStatsModal();
        else if (target.id === 'closeStatsModal') this.closeStatsModal();
        else if (target.id === 'teamInfo') this.openTeamDetailsModal();
        else if (target.id === 'closeTeamDetailsModal') this.closeTeamDetailsModal();
        else if (target.id === 'voteBtn') this.handleVote();
        else if (target.id === 'sizeDecreaseBtn') this.adjustSize(-0.2);
        else if (target.id === 'sizeIncreaseBtn') this.adjustSize(0.2);
        else if (target.id === 'galleryModal' && e.target === target) this.closeModal();
        else if (target.id === 'statsModal' && e.target === target) this.closeStatsModal();
        else if (target.id === 'teamDetailsModal' && e.target === target) this.closeTeamDetailsModal();
    }

    setupModalEvents() {
        // Modal overlay click handling is done in handleGlobalClick
    }

    setupDragZoom() {
        const galleryImage = document.getElementById('galleryImage');
        
        // Mouse events
        galleryImage.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Wheel zoom
        galleryImage.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

        // Touch events
        galleryImage.addEventListener('touchstart', this.handleTouchStart.bind(this));
        galleryImage.addEventListener('touchmove', this.handleTouchMove.bind(this));
        galleryImage.addEventListener('touchend', this.handleTouchEnd.bind(this));
        galleryImage.addEventListener('contextmenu', e => e.preventDefault());
    }

    // Consolidated drag/zoom handling
    handleMouseDown(e) {
        if (!this.isModalOpen) return;
        e.preventDefault();
        this.startDrag(e.clientX, e.clientY);
        document.getElementById('galleryImage').classList.add('dragging');
        this.showZoomHint();
    }

    handleMouseMove(e) {
        if (this.isDragging && this.isModalOpen) {
            e.preventDefault();
            this.updateDrag(e.clientX, e.clientY);
        }
    }

    handleMouseUp() {
        this.endDrag();
    }

    handleTouchStart(e) {
        if (!this.isModalOpen) return;
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.startDrag(touch.clientX, touch.clientY);
        } else if (e.touches.length === 2) {
            this.startPinch(e.touches);
        }
    }

    handleTouchMove(e) {
        if (!this.isModalOpen) return;
        e.preventDefault();

        if (e.touches.length === 1 && this.isDragging) {
            const touch = e.touches[0];
            this.updateDrag(touch.clientX, touch.clientY);
        } else if (e.touches.length === 2) {
            this.updatePinch(e.touches);
        }
    }

    handleTouchEnd() {
        this.endDrag();
    }

    startDrag(x, y) {
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.imageStartOffsetX = this.imageOffsetX;
        this.imageStartOffsetY = this.imageOffsetY;
    }

    updateDrag(x, y) {
        const deltaX = x - this.dragStartX;
        const deltaY = y - this.dragStartY;
        this.imageOffsetX = this.imageStartOffsetX + deltaX;
        this.imageOffsetY = this.imageStartOffsetY + deltaY;
        this.applyImageTransform();
    }

    endDrag() {
        this.isDragging = false;
        document.getElementById('galleryImage').classList.remove('dragging');
        this.hideZoomHint();
    }

    startPinch(touches) {
        this.isDragging = false;
        this.initialPinchDistance = this.getDistance(touches[0], touches[1]);
        this.initialScale = this.currentScale;
    }

    updatePinch(touches) {
        const distance = this.getDistance(touches[0], touches[1]);
        const scale = (distance / this.initialPinchDistance) * this.initialScale;
        this.currentScale = Math.min(Math.max(scale, 0.3), 5.0);
        
        if (this.currentScale <= 1.0) {
            this.imageOffsetX = 0;
            this.imageOffsetY = 0;
        }
        this.applyImageTransform();
    }

    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    handleWheel(e) {
        if (!this.isModalOpen) return;
        e.preventDefault();
        
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        this.adjustSize(delta);
        this.showZoomHint();
        clearTimeout(this.zoomHintTimeout);
        this.zoomHintTimeout = setTimeout(() => this.hideZoomHint(), 2000);
    }

    adjustSize(delta) {
        this.currentScale = Math.min(Math.max(this.currentScale + delta, 0.3), 5.0);
        if (this.currentScale <= 1.0) {
            this.imageOffsetX = 0;
            this.imageOffsetY = 0;
        }
        this.applyImageTransform();
    }

    applyImageTransform() {
        const image = document.getElementById('galleryImage');
        if (image) {
            let transform = `scale(${this.currentScale})`;
            if (this.imageOffsetX || this.imageOffsetY) {
                transform += ` translate(${this.imageOffsetX / this.currentScale}px, ${this.imageOffsetY / this.currentScale}px)`;
            }
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
            document.body.appendChild(hint);
        }
        hint.innerHTML = `Zoom: ${Math.round(this.currentScale * 100)}% • Scroll to zoom • Drag to pan`;
        hint.classList.add('show');
    }

    hideZoomHint() {
        const hint = document.querySelector('.zoom-hint');
        if (hint) {
            hint.classList.remove('show');
            setTimeout(() => {
                if (hint.parentNode) document.body.removeChild(hint);
            }, 300);
        }
    }

    openGallery(teamNumber, photoNumber) {
        this.currentTeam = teamNumber;
        this.currentPhoto = photoNumber;
        this.resetImageState();
        this.showModal('gallery');
        this.updateImage();
        this.updateURL();
        this.showKeyboardHint();
    }

    resetImageState() {
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.imageOffsetX = 0;
        this.imageOffsetY = 0;
    }

    updateImage() {
        const team = this.teams.find(t => t.team_number === this.currentTeam);
        if (!team) return;

        const imageUrl = team.images[this.currentPhoto - 1];
        const galleryImage = document.getElementById('galleryImage');

        galleryImage.classList.add('loading');
        this.resetImageState();
        galleryImage.style.transform = '';

        // Use optimized image loading
        this.loadImage(imageUrl).then(() => {
            galleryImage.src = imageUrl;
            galleryImage.alt = `${team.team_name} - Photo ${this.currentPhoto}`;
            galleryImage.classList.remove('loading');
            this.updateTeamInfo(team);
        }).catch(() => {
            galleryImage.classList.remove('loading');
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

    navigateImage(direction) {
        this.currentPhoto += direction;

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

        if (newIndex >= teamNumbers.length) newIndex = 0;
        else if (newIndex < 0) newIndex = teamNumbers.length - 1;

        this.currentTeam = teamNumbers[newIndex];
    }

    rotateImage(degrees) {
        this.currentRotation = (this.currentRotation + degrees) % 360;
        if (this.currentRotation < 0) this.currentRotation += 360;
        this.applyImageTransform();
    }

    showModal(type) {
        const modals = ['gallery', 'stats', 'teamDetails'];
        
        modals.forEach(modalType => {
            const modal = document.getElementById(`${modalType}Modal`);
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
            }
        });

        const targetModal = document.getElementById(`${type}Modal`);
        if (targetModal) {
            targetModal.classList.remove('hidden');
            targetModal.classList.add('show');
            document.body.style.overflow = 'hidden';
            if (type === 'gallery') this.isModalOpen = true;
        }
    }

    closeModal() {
        this.closeAllModals();
        this.isModalOpen = false;
        window.history.pushState({}, '', window.location.pathname);
        this.hideKeyboardHint();
        this.hideZoomHint();
    }

    closeAllModals() {
        ['galleryModal', 'statsModal', 'teamDetailsModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('show');
                modal.classList.add('hidden');
            }
        });
        document.body.style.overflow = 'auto';
    }

    openStatsModal() {
        this.showModal('stats');
        this.renderStats();
    }

    closeStatsModal() {
        this.closeAllModals();
    }

    openTeamDetailsModal() {
        if (!this.isModalOpen) this.isModalOpen = true;

        const team = this.teams.find(t => t.team_number === this.currentTeam);
        if (team) {
            this.showModal('teamDetails');
            this.renderTeamDetails(team);
        }
    }

    closeTeamDetailsModal() {
        this.closeAllModals();
        if (this.isModalOpen) this.showModal('gallery');
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
                                <div class="course-bar-fill" style="width: ${percentage}%">${count}</div>
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
        document.getElementById('teamDetailsTitle').textContent = `${team.team_name} (#${team.team_number})`;
        document.getElementById('teamDetailsContent').innerHTML = `
            <table class="team-details-table">
                <tr><th>Team Name</th><td>${team.team_name}</td></tr>
                <tr><th>Team Number</th><td>#${team.team_number}</td></tr>
                <tr><th>Course</th><td>${team.course} (Batch ${team.batch})</td></tr>
                <tr><th>Semester</th><td>${team.semester}</td></tr>
                <tr><th>Members</th><td>${team.members.join('<br>')}</td></tr>
                <tr><th>Contact</th><td><a href="tel:${team.contact}" class="underline hover:no-underline">${team.contact}</a></td></tr>
                <tr><th>Submission Time</th><td>${team.upload_time}</td></tr>
                ${team.notes ? `<tr><th>Notes</th><td>${team.notes}</td></tr>` : ''}
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

    handleKeyboard(e) {
        if (!this.isModalOpen) return;

        const keyActions = {
            'Escape': () => this.closeModal(),
            'ArrowLeft': () => { e.preventDefault(); this.navigateImage(-1); },
            'ArrowRight': () => { e.preventDefault(); this.navigateImage(1); },
            'ArrowUp': () => { e.preventDefault(); this.navigateTeam(-1); this.updateImage(); this.updateURL(); },
            'ArrowDown': () => { e.preventDefault(); this.navigateTeam(1); this.updateImage(); this.updateURL(); },
            'r': () => { e.preventDefault(); this.rotateImage(90); },
            'R': () => { e.preventDefault(); this.rotateImage(90); },
            'l': () => { e.preventDefault(); this.rotateImage(-90); },
            'L': () => { e.preventDefault(); this.rotateImage(-90); },
            'i': () => { e.preventDefault(); this.openTeamDetailsModal(); },
            'I': () => { e.preventDefault(); this.openTeamDetailsModal(); },
            '=': () => { e.preventDefault(); this.adjustSize(0.2); },
            '+': () => { e.preventDefault(); this.adjustSize(0.2); },
            '-': () => { e.preventDefault(); this.adjustSize(-0.2); },
            '0': () => { e.preventDefault(); this.resetImageState(); this.applyImageTransform(); this.showZoomHint(); }
        };

        if (keyActions[e.key]) {
            keyActions[e.key]();
            if (e.key === '0') {
                clearTimeout(this.zoomHintTimeout);
                this.zoomHintTimeout = setTimeout(() => this.hideZoomHint(), 2000);
            }
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
            setTimeout(() => this.openGallery(team, photo), 100);
        }
    }

    preloadCriticalImages() {
        // Preload first few team's first images for faster initial loading
        this.teams.slice(0, 3).forEach(team => {
            if (team.images[0]) {
                this.loadImage(team.images[0], true);
            }
        });
    }

    showKeyboardHint() {
        const hint = document.createElement('div');
        hint.className = 'keyboard-hint';
        hint.innerHTML = 'Arrow keys: navigate • +/-/0: zoom • Drag/Scroll: pan/zoom • R/L: rotate • I: team info • ESC: close';
        document.body.appendChild(hint);

        setTimeout(() => hint.classList.add('show'), 100);
        setTimeout(() => {
            hint.classList.remove('show');
            setTimeout(() => hint.parentNode && document.body.removeChild(hint), 300);
        }, 4000);
    }

    hideKeyboardHint() {
        document.querySelectorAll('.keyboard-hint').forEach(hint => {
            hint.classList.remove('show');
            setTimeout(() => hint.parentNode && hint.parentNode.removeChild(hint), 300);
        });
    }

    handleVote() {
        window.open('https://google.com', '_blank', 'width=800,height=600');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.galleryApp = new GalleryApp();
});

// Handle browser navigation
window.addEventListener('popstate', () => {
    window.galleryApp?.handleURLParams();
});