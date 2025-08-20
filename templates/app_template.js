// Photography Contest Gallery - MONO Design System
// Enhanced with Stats Modal and Team Details

class GalleryApp {
    constructor() {
        this.teams = {{TEAMS_DATA}};
        this.currentTeam = 1;
        this.currentPhoto = 1;
        this.currentRotation = 0;
        this.currentScale = 1.0;
        this.isModalOpen = false;
        this.stats = this.calculateStats();

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
                    ${team.images.map((img, index) => `
                        <div class="relative">
                            <img src="${img}" 
                                 alt="${team.team_name} Photo ${index + 1}"
                                 class="image-preview w-full cursor-pointer hover:opacity-80 transition-opacity"
                                 onclick="window.galleryApp.openGallery(${team.team_number}, ${index + 1})"
                                 loading="lazy"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjVmNSIvPiA8dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        </div>
                    `).join('')}
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
    }
    

    increaseSize() {
        this.currentScale = Math.min(this.currentScale + 0.2, 3.0);
        this.applyImageTransform();
    }

    decreaseSize() {
        this.currentScale = Math.max(this.currentScale - 0.2, 0.5);
        this.applyImageTransform();
    }

    applyImageTransform() {
        const image = document.getElementById('galleryImage');
        if (image) {
            let transform = `scale(${this.currentScale})`;
            if (this.currentRotation !== 0) {
                transform += ` rotate(${this.currentRotation}deg)`;
            }
            image.style.transform = transform;
        }
    }

    setupTouchGestures() {
        const image = document.getElementById('galleryImage');
        if (!image) return;

        let initialDistance = 0;
        let initialScale = this.currentScale;

        const getDistance = (touch1, touch2) => {
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            return Math.sqrt(dx * dx + dy * dy);
        };

        image.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                initialDistance = getDistance(e.touches[0], e.touches[1]);
                initialScale = this.currentScale;
            }
        });

        image.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = getDistance(e.touches[0], e.touches[1]);
                const scaleChange = currentDistance / initialDistance;
                this.currentScale = Math.min(Math.max(initialScale * scaleChange, 0.5), 3.0);
                this.applyImageTransform();
            }
        });

        image.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                initialDistance = 0;
            }
        });
    }

    openGallery(teamNumber, photoNumber) {
        this.currentTeam = teamNumber;
        this.currentPhoto = photoNumber;
        this.currentRotation = 0;

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

        galleryImage.classList.add('loading');
        galleryImage.src = imageUrl;
        galleryImage.alt = `${team.team_name} - Photo ${this.currentPhoto}`;

        // Reset rotation
        galleryImage.style.transform = '';
        this.currentRotation = 0;

        // Update team info
        this.updateTeamInfo(team);

        galleryImage.onload = () => {
            galleryImage.classList.remove('loading');
        };
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
        // Preload first few team images
        this.teams.slice(0, 5).forEach(team => {
            team.images.forEach(imageUrl => {
                const img = new Image();
                img.src = imageUrl;
            });
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
        hint.innerHTML = 'Arrow keys: navigate • R/L: rotate • I: team info • ESC: close';
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
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galleryApp = new GalleryApp();
});

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    if (window.galleryApp) {
        window.galleryApp.handleURLParams();
    }
});