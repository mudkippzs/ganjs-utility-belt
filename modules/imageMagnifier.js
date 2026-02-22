// Image Magnifier - Toggle-enabled image magnification tool
// Uses modalShell for draggable/resizable chrome and chrome.storage.local for position/size persistence.
const ImageMagnifier = (() => {
  const MODAL_ID = 'imageMagnifier';
  let isEnabled = false;
  let magnifier = null; // wrapper element (ganj-modal-panel)
  let currentImage = null;

  function init() {
    createMagnifier();
    attachEventListeners();
  }

  function createMagnifier() {
    if (magnifier) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'image-magnifier-wrapper ganj-modal-panel hidden';
    wrapper.id = 'ganj-modal-' + MODAL_ID;
    wrapper.setAttribute('aria-label', 'Image magnifier lens');
    wrapper.style.cssText = `
      position: fixed;
      width: 200px;
      height: 200px;
      left: 100px;
      top: 100px;
      z-index: 999999;
      overflow: visible;
      pointer-events: auto;
    `;

    const lensContainer = document.createElement('div');
    lensContainer.className = 'magnifier-lens-container';
    lensContainer.style.cssText = `
      position: absolute;
      inset: 0;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 15px rgba(0,0,0,0.3);
      background: #f0f0f0;
      overflow: hidden;
    `;

    const lens = document.createElement('div');
    lens.className = 'magnifier-lens';
    lens.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-repeat: no-repeat;
      pointer-events: none;
    `;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'ganj-modal-drag-handle';
    dragHandle.setAttribute('aria-hidden', 'true');
    dragHandle.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 24px;
      z-index: 1;
      border-radius: 50% 50% 0 0;
      background: rgba(0,0,0,0.2);
    `;

    lensContainer.appendChild(lens);
    wrapper.appendChild(lensContainer);
    wrapper.appendChild(dragHandle);
    document.body.appendChild(wrapper);
    magnifier = wrapper;

    if (window.ModalShell) {
      window.ModalShell.restorePosition(magnifier, MODAL_ID);
      window.ModalShell.makeDraggable(magnifier, MODAL_ID, { handle: '.ganj-modal-drag-handle' });
      window.ModalShell.makeResizable(magnifier, MODAL_ID);
    }
  }

  function attachEventListeners() {
    document.addEventListener('mouseenter', handleImageHover, true);
    document.addEventListener('mouseleave', handleImageLeave, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('contextmenu', handleRightClick, true);
    
    // Keyboard shortcut to toggle
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && isEnabled) {
        disable();
        showNotification('Image Magnifier disabled');
      }
    });
  }

  function handleImageHover(e) {
    if (!isEnabled) return;
    
    const target = e.target;
    if (target.tagName === 'IMG' || (target.style && target.style.backgroundImage)) {
      currentImage = target;
      showMagnifier(target, e);
    }
  }

  function handleImageLeave(e) {
    if (!isEnabled) return;
    
    if (e.target === currentImage) {
      hideMagnifier();
      currentImage = null;
    }
  }

  function handleMouseMove(e) {
    if (!isEnabled || !currentImage || magnifier.classList.contains('hidden')) return;
    
    updateMagnifierPosition(e);
  }

  function handleRightClick(e) {
    if (e.target.tagName === 'IMG' || (e.target.style && e.target.style.backgroundImage)) {
      // Check if right-clicking on an image while magnifier is enabled
      if (isEnabled) {
        e.preventDefault();
        disable();
        showNotification('Image Magnifier disabled');
      }
    }
  }

  function showMagnifier(imageElement, mouseEvent) {
    const lens = magnifier.querySelector('.magnifier-lens');
    let imageUrl = '';
    
    if (imageElement.tagName === 'IMG') {
      imageUrl = imageElement.src;
    } else if (imageElement.style.backgroundImage) {
      const match = imageElement.style.backgroundImage.match(/url\(["']?([^"']*)["']?\)/);
      if (match) {
        imageUrl = match[1];
      }
    }
    
    if (!imageUrl) return;
    
    // Set the magnified image
    lens.style.backgroundImage = `url(${imageUrl})`;
    
    // Calculate zoom level based on original image size
    const img = new Image();
    img.onload = () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const displayWidth = imageElement.offsetWidth || imageElement.clientWidth;
      const displayHeight = imageElement.offsetHeight || imageElement.clientHeight;
      
      // Determine appropriate zoom level
      let zoomLevel = 2;
      if (originalWidth === displayWidth && originalHeight === displayHeight) {
        zoomLevel = 3; // More zoom if image is already full size
      }
      
      const magnifiedWidth = displayWidth * zoomLevel;
      const magnifiedHeight = displayHeight * zoomLevel;
      
      lens.style.backgroundSize = `${magnifiedWidth}px ${magnifiedHeight}px`;
      
      magnifier.classList.remove('hidden');
      updateMagnifierPosition(mouseEvent);
    };
    img.src = imageUrl;
  }

  function hideMagnifier() {
    magnifier.classList.add('hidden');
  }

  function updateMagnifierPosition(e) {
    if (!currentImage) return;
    
    const rect = magnifier.getBoundingClientRect();
    const magnifierWidth = rect.width;
    const magnifierHeight = rect.height;
    const imageRect = currentImage.getBoundingClientRect();
    
    const x = e.clientX - imageRect.left;
    const y = e.clientY - imageRect.top;
    
    const lens = magnifier.querySelector('.magnifier-lens');
    const bgSize = lens.style.backgroundSize;
    
    if (bgSize) {
      const [bgWidth, bgHeight] = bgSize.split(' ').map(s => parseInt(s));
      const ratioX = bgWidth / imageRect.width;
      const ratioY = bgHeight / imageRect.height;
      
      const bgX = -x * ratioX + magnifierWidth / 2;
      const bgY = -y * ratioY + magnifierHeight / 2;
      
      lens.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }
    
    const offsetX = 20;
    const offsetY = 20;
    
    let left = e.clientX + offsetX;
    let top = e.clientY + offsetY;
    
    if (left + magnifierWidth > window.innerWidth) {
      left = e.clientX - magnifierWidth - offsetX;
    }
    if (top + magnifierHeight > window.innerHeight) {
      top = e.clientY - magnifierHeight - offsetY;
    }
    
    magnifier.style.left = left + 'px';
    magnifier.style.top = top + 'px';
  }

  function enable() {
    isEnabled = true;
    showNotification('Image Magnifier enabled - Hover over images to magnify. Right-click to disable.');
  }

  function disable() {
    isEnabled = false;
    hideMagnifier();
    currentImage = null;
  }

  function toggle() {
    if (isEnabled) {
      disable();
      showNotification('Image Magnifier disabled');
    } else {
      enable();
    }
  }

  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'magnifier-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 12px 20px;
      border-radius: 4px;
      z-index: 1000000;
      font-size: 14px;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
  }

  return { init, enable, disable, toggle, isEnabled: () => isEnabled };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ImageMagnifier.init);
} else {
  ImageMagnifier.init();
}

// Make it globally accessible
window.ImageMagnifier = ImageMagnifier;
