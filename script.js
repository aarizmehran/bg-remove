// Photo Editor Pro - Main JavaScript

class PhotoEditor {
    constructor() {
        // Canvas and context
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // State
        this.originalImage = null;
        this.currentImage = null;
        this.zoom = 1;
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.drawTexts = [];
        this.selectedTextIndex = -1;
        this.isDraggingText = false;
        
        // Adjustments
        this.adjustments = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            exposure: 0,
            hueRotate: 0,
            blur: 0,
            sharpness: 0,
            opacity: 100,
            grayscale: 0,
            sepia: 0,
            invert: 0
        };
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // Drawing state
        this.lastX = 0;
        this.lastY = 0;
        this.brushSize = 5;
        this.brushColor = '#000000';
        
        // Filter presets
        this.filters = {
            none: { brightness: 100, contrast: 100, saturation: 100, sepia: 0, grayscale: 0, hueRotate: 0 },
            vintage: { brightness: 110, contrast: 90, saturation: 70, sepia: 40, grayscale: 0, hueRotate: 0 },
            cinematic: { brightness: 90, contrast: 120, saturation: 80, sepia: 0, grayscale: 0, hueRotate: 0 },
            neon: { brightness: 110, contrast: 130, saturation: 150, sepia: 0, grayscale: 0, hueRotate: 20 },
            bw: { brightness: 100, contrast: 120, saturation: 0, sepia: 0, grayscale: 100, hueRotate: 0 },
            warm: { brightness: 105, contrast: 100, saturation: 120, sepia: 20, grayscale: 0, hueRotate: -10 },
            cool: { brightness: 100, contrast: 110, saturation: 90, sepia: 0, grayscale: 0, hueRotate: 20 },
            retro: { brightness: 110, contrast: 90, saturation: 80, sepia: 30, grayscale: 0, hueRotate: -15 },
            hdr: { brightness: 100, contrast: 140, saturation: 130, sepia: 0, grayscale: 0, hueRotate: 0 },
            softglow: { brightness: 115, contrast: 90, saturation: 110, sepia: 10, grayscale: 0, hueRotate: 0 }
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.updateSliderValues();
    }
    
    setupEventListeners() {
        // Upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.loadImage(files[0]);
            }
        });
        
        // Tool navigation
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTool(btn.dataset.tool));
        });
        
        // Adjustment sliders
        Object.keys(this.adjustments).forEach(key => {
            const slider = document.getElementById(key);
            if (slider) {
                slider.addEventListener('input', (e) => {
                    this.adjustments[key] = parseInt(e.target.value);
                    this.updateSliderValues();
                    this.applyAdjustments();
                });
            }
        });
        
        // Transform buttons
        document.getElementById('rotateLeft')?.addEventListener('click', () => this.rotate(-90));
        document.getElementById('rotateRight')?.addEventListener('click', () => this.rotate(90));
        document.getElementById('flipHorizontal')?.addEventListener('click', () => this.flip('horizontal'));
        document.getElementById('flipVertical')?.addEventListener('click', () => this.flip('vertical'));
        
        // Crop presets
        document.querySelectorAll('.btn-crop-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-crop-preset').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Resize
        document.getElementById('resizeWidth')?.addEventListener('input', (e) => {
            if (document.getElementById('maintainAspectRatio')?.checked && this.currentImage) {
                const ratio = this.currentImage.height / this.currentImage.width;
                document.getElementById('resizeHeight').value = Math.round(e.target.value * ratio);
            }
        });
        
        document.getElementById('resizeHeight')?.addEventListener('input', (e) => {
            if (document.getElementById('maintainAspectRatio')?.checked && this.currentImage) {
                const ratio = this.currentImage.width / this.currentImage.height;
                document.getElementById('resizeWidth').value = Math.round(e.target.value * ratio);
            }
        });
        
        document.getElementById('applyResize')?.addEventListener('click', () => this.resizeImage());
        
        // Draw tools
        document.getElementById('brushTool')?.addEventListener('click', () => this.setDrawTool('brush'));
        document.getElementById('eraserTool')?.addEventListener('click', () => this.setDrawTool('eraser'));
        
        document.getElementById('brushSize')?.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            document.getElementById('brushSizeValue').textContent = this.brushSize;
        });
        
        document.getElementById('brushColor')?.addEventListener('input', (e) => {
            this.brushColor = e.target.value;
        });
        
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', () => {
                this.brushColor = preset.dataset.color;
                document.getElementById('brushColor').value = this.brushColor;
            });
        });
        
        // Text tool
        document.getElementById('addText')?.addEventListener('click', () => this.addText());
        
        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFilter(e.currentTarget.dataset.filter));
        });
        
        // Zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => this.changeZoom(0.1));
        document.getElementById('zoomOut')?.addEventListener('click', () => this.changeZoom(-0.1));
        document.getElementById('fitToScreen')?.addEventListener('click', () => this.fitToScreen());
        
        // History controls
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetAll());
        
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => this.toggleTheme());
        
        // Export
        document.getElementById('exportBtn')?.addEventListener('click', () => this.showExportModal());
        document.getElementById('cancelExport')?.addEventListener('click', () => this.hideExportModal());
        document.getElementById('confirmExport')?.addEventListener('click', () => this.exportImage());
        
        document.getElementById('exportQuality')?.addEventListener('input', (e) => {
            document.getElementById('exportQualityValue').textContent = e.target.value + '%';
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    this.undo();
                } else if (e.key === 'y') {
                    e.preventDefault();
                    this.redo();
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this.selectedTextIndex >= 0) {
                    this.deleteSelectedText();
                }
            }
        });
        
        // Canvas events for drawing and text dragging
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleMouseUp());
    }
    
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadImage(file);
        }
    }
    
    loadImage(file) {
        if (!file.type.match('image/(jpeg|png|webp)')) {
            alert('Please select a valid image file (JPG, PNG, or WEBP)');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.setupCanvas();
                this.resetAdjustments();
                this.drawTexts = [];
                this.history = [];
                this.historyIndex = -1;
                this.saveState();
                
                document.getElementById('canvasPlaceholder').style.display = 'none';
                document.getElementById('zoomControls').style.display = 'flex';
                document.getElementById('historyControls').style.display = 'flex';
                
                // Set resize inputs
                document.getElementById('resizeWidth').value = img.width;
                document.getElementById('resizeHeight').value = img.height;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    setupCanvas() {
        if (!this.currentImage) return;
        
        this.canvas.width = this.currentImage.width;
        this.canvas.height = this.currentImage.height;
        this.ctx.drawImage(this.currentImage, 0, 0);
        this.applyAdjustments();
    }
    
    resetAdjustments() {
        this.adjustments = {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            exposure: 0,
            hueRotate: 0,
            blur: 0,
            sharpness: 0,
            opacity: 100,
            grayscale: 0,
            sepia: 0,
            invert: 0
        };
        
        // Reset sliders
        Object.keys(this.adjustments).forEach(key => {
            const slider = document.getElementById(key);
            if (slider) {
                slider.value = this.adjustments[key];
            }
        });
        
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.zoom = 1;
        this.updateZoomDisplay();
    }
    
    updateSliderValues() {
        document.getElementById('brightnessValue').textContent = this.adjustments.brightness;
        document.getElementById('contrastValue').textContent = this.adjustments.contrast;
        document.getElementById('saturationValue').textContent = this.adjustments.saturation;
        document.getElementById('exposureValue').textContent = this.adjustments.exposure;
        document.getElementById('hueRotateValue').textContent = this.adjustments.hueRotate + '°';
        document.getElementById('blurValue').textContent = this.adjustments.blur;
        document.getElementById('sharpnessValue').textContent = this.adjustments.sharpness;
        document.getElementById('opacityValue').textContent = this.adjustments.opacity;
        document.getElementById('grayscaleValue').textContent = this.adjustments.grayscale;
        document.getElementById('sepiaValue').textContent = this.adjustments.sepia;
        document.getElementById('invertValue').textContent = this.adjustments.invert;
    }
    
    applyAdjustments() {
        if (!this.originalImage) return;
        
        // Redraw original image
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply transforms
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate((this.rotation * Math.PI) / 180);
        this.ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
        this.ctx.translate(-centerX, -centerY);
        
        // Apply filters
        const filterString = `
            brightness(${this.adjustments.brightness}%)
            contrast(${this.adjustments.contrast}%)
            saturate(${this.adjustments.saturation}%)
            hue-rotate(${this.adjustments.hueRotate}deg)
            blur(${this.adjustments.blur}px)
            grayscale(${this.adjustments.grayscale}%)
            sepia(${this.adjustments.sepia}%)
            invert(${this.adjustments.invert}%)
        `;
        
        this.ctx.filter = filterString;
        this.ctx.globalAlpha = this.adjustments.opacity / 100;
        
        // Draw image
        this.ctx.drawImage(
            this.originalImage,
            0, 0,
            this.canvas.width,
            this.canvas.height
        );
        
        this.ctx.restore();
        
        // Apply sharpness (convolution)
        if (this.adjustments.sharpness > 0) {
            this.applySharpness(this.adjustments.sharpness);
        }
        
        // Apply exposure
        if (this.adjustments.exposure !== 0) {
            this.applyExposure(this.adjustments.exposure);
        }
        
        // Redraw texts
        this.drawTexts.forEach(text => this.renderText(text));
    }
    
    applySharpness(amount) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const mix = amount / 100;
        const kernel = [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0
        ];
        
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    let ki = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            sum += tempData[idx] * kernel[ki];
                            ki++;
                        }
                    }
                    const idx = (y * width + x) * 4 + c;
                    data[idx] = tempData[idx] * (1 - mix) + sum * mix;
                }
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    applyExposure(amount) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const factor = Math.pow(2, amount / 100);
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * factor);
            data[i + 1] = Math.min(255, data[i + 1] * factor);
            data[i + 2] = Math.min(255, data[i + 2] * factor);
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    rotate(degrees) {
        this.rotation = (this.rotation + degrees) % 360;
        this.swapDimensionsIfNeeded();
        this.saveState();
        this.applyAdjustments();
    }
    
    swapDimensionsIfNeeded() {
        if (Math.abs(this.rotation % 180) === 90) {
            const temp = this.canvas.width;
            this.canvas.width = this.canvas.height;
            this.canvas.height = temp;
        }
    }
    
    flip(direction) {
        if (direction === 'horizontal') {
            this.flipH = !this.flipH;
        } else {
            this.flipV = !this.flipV;
        }
        this.saveState();
        this.applyAdjustments();
    }
    
    resizeImage() {
        const newWidth = parseInt(document.getElementById('resizeWidth').value);
        const newHeight = parseInt(document.getElementById('resizeHeight').value);
        
        if (!newWidth || !newHeight) return;
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        
        // Get current image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        tempCtx.putImageData(imageData, 0, 0);
        
        // Create new image
        const img = new Image();
        img.onload = () => {
            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.ctx.drawImage(img, 0, 0, newWidth, newHeight);
            this.applyAdjustments();
            this.saveState();
        };
        img.src = tempCanvas.toDataURL();
    }
    
    setDrawTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.btn-draw-tool').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(tool + 'Tool')?.classList.add('active');
    }
    
    handleMouseDown(e) {
        if (!this.currentImage) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.isDrawing = true;
            this.lastX = x;
            this.lastY = y;
            this.saveState();
        } else if (this.currentTool === 'text') {
            // Check if clicking on existing text
            this.checkTextClick(x, y);
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing || !this.currentImage) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.draw(this.lastX, this.lastY, x, y);
        this.lastX = x;
        this.lastY = y;
    }
    
    handleMouseUp() {
        this.isDrawing = false;
        this.isDraggingText = false;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    draw(x1, y1, x2, y2) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = this.brushSize;
        
        if (this.currentTool === 'eraser') {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.strokeStyle = this.brushColor;
            this.ctx.globalCompositeOperation = 'source-over';
        }
        
        this.ctx.stroke();
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    addText() {
        const content = document.getElementById('textContent').value;
        if (!content.trim()) {
            alert('Please enter some text');
            return;
        }
        
        const fontSize = parseInt(document.getElementById('fontSize').value);
        const fontFamily = document.getElementById('fontFamily').value;
        const color = document.getElementById('textColor').value;
        
        const textObj = {
            content: content,
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            fontSize: fontSize,
            fontFamily: fontFamily,
            color: color
        };
        
        this.drawTexts.push(textObj);
        this.renderText(textObj);
        this.saveState();
    }
    
    renderText(text) {
        this.ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        this.ctx.fillStyle = text.color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text.content, text.x, text.y);
    }
    
    checkTextClick(x, y) {
        for (let i = this.drawTexts.length - 1; i >= 0; i--) {
            const text = this.drawTexts[i];
            this.ctx.font = `${text.fontSize}px ${text.fontFamily}`;
            const metrics = this.ctx.measureText(text.content);
            const width = metrics.width;
            const height = text.fontSize;
            
            if (
                x >= text.x - width / 2 &&
                x <= text.x + width / 2 &&
                y >= text.y - height / 2 &&
                y <= text.y + height / 2
            ) {
                this.selectedTextIndex = i;
                this.isDraggingText = true;
                return;
            }
        }
        this.selectedTextIndex = -1;
    }
    
    deleteSelectedText() {
        if (this.selectedTextIndex >= 0) {
            this.drawTexts.splice(this.selectedTextIndex, 1);
            this.selectedTextIndex = -1;
            this.applyAdjustments();
            this.saveState();
        }
    }
    
    applyFilter(filterName) {
        if (!this.originalImage) return;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filterName}"]`)?.classList.add('active');
        
        const filter = this.filters[filterName];
        if (filter) {
            this.adjustments.brightness = filter.brightness;
            this.adjustments.contrast = filter.contrast;
            this.adjustments.saturation = filter.saturation;
            this.adjustments.sepia = filter.sepia;
            this.adjustments.grayscale = filter.grayscale;
            this.adjustments.hueRotate = filter.hueRotate;
            
            // Update sliders
            Object.keys(this.adjustments).forEach(key => {
                const slider = document.getElementById(key);
                if (slider) {
                    slider.value = this.adjustments[key];
                }
            });
            
            this.updateSliderValues();
            this.applyAdjustments();
            this.saveState();
        }
    }
    
    changeZoom(delta) {
        this.zoom = Math.max(0.1, Math.min(5, this.zoom + delta));
        this.updateZoomDisplay();
        this.canvas.style.transform = `scale(${this.zoom})`;
    }
    
    fitToScreen() {
        const container = document.getElementById('canvasContainer');
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / this.canvas.width;
        const scaleY = containerHeight / this.canvas.height;
        this.zoom = Math.min(scaleX, scaleY, 1);
        
        this.updateZoomDisplay();
        this.canvas.style.transform = `scale(${this.zoom})`;
    }
    
    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
    }
    
    switchTool(toolName) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${toolName}"]`)?.classList.add('active');
        
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.querySelector(`[data-panel="${toolName}"]`)?.classList.add('active');
        
        if (toolName === 'draw' || toolName === 'text') {
            this.currentTool = toolName === 'draw' ? 'brush' : 'text';
        }
    }
    
    saveState() {
        if (!this.currentImage) return;
        
        // Remove any future states if we're in the middle of history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        const state = {
            imageData: this.canvas.toDataURL(),
            adjustments: { ...this.adjustments },
            rotation: this.rotation,
            flipH: this.flipH,
            flipV: this.flipV,
            texts: JSON.parse(JSON.stringify(this.drawTexts))
        };
        
        this.history.push(state);
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }
    
    restoreState(state) {
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0);
            this.adjustments = { ...state.adjustments };
            this.rotation = state.rotation;
            this.flipH = state.flipH;
            this.flipV = state.flipV;
            this.drawTexts = JSON.parse(JSON.stringify(state.texts));
            
            // Update sliders
            Object.keys(this.adjustments).forEach(key => {
                const slider = document.getElementById(key);
                if (slider) {
                    slider.value = this.adjustments[key];
                }
            });
            
            this.updateSliderValues();
        };
        img.src = state.imageData;
    }
    
    resetAll() {
        if (!this.originalImage) return;
        
        if (confirm('Are you sure you want to reset all edits?')) {
            this.resetAdjustments();
            this.drawTexts = [];
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(this.originalImage, 0, 0);
            this.history = [];
            this.historyIndex = -1;
            this.saveState();
            
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    showExportModal() {
        if (!this.currentImage) {
            alert('Please upload an image first');
            return;
        }
        document.getElementById('exportModal').classList.add('active');
    }
    
    hideExportModal() {
        document.getElementById('exportModal').classList.remove('active');
    }
    
    exportImage() {
        const format = document.getElementById('exportFormat').value;
        const quality = parseInt(document.getElementById('exportQuality').value) / 100;
        
        // Create a temporary canvas with the final image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Draw current canvas content
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Download
        const link = document.createElement('a');
        link.download = `edited-image-${Date.now()}.${format.split('/')[1]}`;
        link.href = tempCanvas.toDataURL(format, quality);
        link.click();
        
        this.hideExportModal();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.photoEditor = new PhotoEditor();
});
