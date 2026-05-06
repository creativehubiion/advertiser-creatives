function injectIframe() {
    document.body.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.src = 'https://ads.pexi.nl/zl69f3242969f7852/index.html';
    iframe.width = '320';
    iframe.height = '480';
    iframe.style.border = 'none';

    // Basic styling for body
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    document.body.appendChild(iframe);
}

if (document.body) {
    injectIframe();
} else {
    window.addEventListener('DOMContentLoaded', injectIframe);
}
