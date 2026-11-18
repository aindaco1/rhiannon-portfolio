document.addEventListener("click", (event) => {
  const link = event.target.closest(".video-play");
  if (!link) return;
  event.preventDefault();
  const frame = link.closest(".video");
  const id = frame.dataset.videoId;
  const iframe = document.createElement("iframe");
  iframe.src =
    frame.dataset.videoProvider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`
      : `https://player.vimeo.com/video/${id}?autoplay=1${frame.dataset.videoHash ? "&h=" + frame.dataset.videoHash : ""}`;
  iframe.title = "Film player";
  iframe.allow = "autoplay; fullscreen; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  frame.replaceChildren(iframe);
  iframe.focus();
});

// Each block is its own gallery; DOM order also defines keyboard navigation.
// Links still open the original image if JavaScript is unavailable.
let galleryDialog, galleryImage, galleryCaption, galleryStatus, galleryPrevious,
  galleryNext, galleryTrigger, galleryLinks = [], galleryIndex = 0;

function showGalleryImage(index) {
  galleryIndex = (index + galleryLinks.length) % galleryLinks.length;
  const link = galleryLinks[galleryIndex];
  galleryImage.src = link.href;
  galleryImage.alt = link.querySelector('img').alt;
  galleryCaption.textContent = link.closest('figure').querySelector('figcaption')?.textContent || '';
  galleryCaption.hidden = !galleryCaption.textContent;
  galleryStatus.textContent = `${galleryIndex + 1} / ${galleryLinks.length}`;
  galleryPrevious.hidden = galleryNext.hidden = galleryLinks.length < 2;
}

function createGalleryDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-dialog';
  dialog.setAttribute('aria-label', 'Image gallery');
  dialog.innerHTML = `<button type="button" class="gallery-close" aria-label="Close gallery" autofocus>Close ×</button>
    <figure class="gallery-stage"><img alt=""><figcaption></figcaption></figure>
    <div class="gallery-controls"><button type="button" class="gallery-previous" aria-label="Previous image">←</button><p class="gallery-status" role="status" aria-live="polite" aria-atomic="true"></p><button type="button" class="gallery-next" aria-label="Next image">→</button></div>`;
  document.body.append(dialog);
  galleryImage = dialog.querySelector('img');
  galleryCaption = dialog.querySelector('figcaption');
  galleryStatus = dialog.querySelector('.gallery-status');
  galleryPrevious = dialog.querySelector('.gallery-previous');
  galleryNext = dialog.querySelector('.gallery-next');
  dialog.querySelector('.gallery-close').onclick = () => dialog.close();
  galleryPrevious.onclick = () => showGalleryImage(galleryIndex - 1);
  galleryNext.onclick = () => showGalleryImage(galleryIndex + 1);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button')].filter(button => !button.hidden);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
      return;
    }
    const offsets = {ArrowLeft: -1, ArrowRight: 1};
    if (!(event.key in offsets)) return;
    event.preventDefault();
    showGalleryImage(galleryIndex + offsets[event.key]);
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('gallery-open');
    galleryImage.removeAttribute('src');
    galleryLinks = [];
    galleryTrigger?.focus({preventScroll: true});
  });
  return dialog;
}

document.addEventListener('click', event => {
  const link = event.target.closest('.gallery-images .gallery-image');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  galleryDialog ||= createGalleryDialog();
  galleryLinks = [...link.closest('.gallery-images').querySelectorAll('.gallery-image')];
  galleryTrigger = link;
  showGalleryImage(galleryLinks.indexOf(link));
  document.body.classList.add('gallery-open');
  galleryDialog.showModal();
});
