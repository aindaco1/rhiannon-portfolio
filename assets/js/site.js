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
