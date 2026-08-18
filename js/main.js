
// Smart PDF Download: Each category PDF downloads only ONCE per browser session
document.querySelectorAll('.dropdown-item[data-pdf]').forEach(item => {
    item.addEventListener('click', function(e) {
        const pdfUrl = this.getAttribute('data-pdf');
        const storageKey = 'downloaded_' + btoa(pdfUrl); // Unique key for each PDF

        // Check if this specific PDF was already downloaded in this session
        if (!sessionStorage.getItem(storageKey)) {
            // Trigger download
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = pdfUrl.split('/').pop(); // Uses actual filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Mark this specific PDF as downloaded for this session
            sessionStorage.setItem(storageKey, 'true');
        }
        // If already downloaded this session → just open page, no re-download
    });
});
(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.sticky-top').addClass('shadow-sm').css('top', '0px');
        } else {
            $('.sticky-top').removeClass('shadow-sm').css('top', '-100px');
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Testimonial carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        items: 1,
        loop: true,
        dots: false,
        nav: true,
        navText : [
            '<i class="bi bi-arrow-left"></i>',
            '<i class="bi bi-arrow-right"></i>'
        ]
    });
    
})(jQuery);
// Automatically make "Categories" active when on any category page
document.addEventListener("DOMContentLoaded", function () {
    const currentPage = location.pathname.split("/").pop(); // gets current filename

    // List of your category pages
    const categoryPages = ["GeneralSurgery.html", "DentalSurgery.html", "404.html"];

    if (categoryPages.includes(currentPage)) {
        // Remove active from all normal nav links
        document.querySelectorAll(".navbar-nav > .nav-item > .nav-link").forEach(link => {
            link.classList.remove("active");
        });

        // Make "Categories" dropdown button active
        document.querySelector(".nav-link.dropdown-toggle").classList.add("active");

        // Optional: highlight the specific dropdown item too
        document.querySelectorAll(".dropdown-item").forEach(item => {
            if (item.getAttribute("data-page") === currentPage) {
                item.classList.add("active");
                item.style.color = "var(--bs-primary)";
                item.style.fontWeight = "600";
            }
        });
    }
});
// Initialize WOW.js (if needed, keep as is)
new WOW().init();

// Detect if device supports hover (desktop/laptop with mouse)
const supportsHover = window.matchMedia('(hover: hover)').matches;

// Get all flip cards and the hint element (optional)
const flipCards = document.querySelectorAll('.flip-card');
const hintSpan = document.getElementById('interactionHint');

// Update hint text based on interaction type
// if (hintSpan) {
//     hintSpan.innerHTML = supportsHover
//         ? '✨ Hover over any card to flip and reveal the category details! ✨'
//         : '👆 Tap any card to flip and see the category — then click the button! 👆';
// }

// Set up flip behavior
if (supportsHover) {
    // Desktop: flip on mouse enter / leave
    flipCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.classList.add('flipped');
        });
        card.addEventListener('mouseleave', () => {
            card.classList.remove('flipped');
        });
    });
} else {
    // Mobile / touch: toggle flip on click, but ignore button clicks
    flipCards.forEach(card => {
        card.addEventListener('click', (event) => {
            // Do not flip if the click was on the button
            if (event.target.closest('.btn-category')) return;
            card.classList.toggle('flipped');
        });
    });
}

const floatBtn = document.getElementById('whatsappFloatLeft');
const popup = document.getElementById('whatsappSimplePopup');
const closeBtn = document.getElementById('closeSimplePopup');

// Open popup on button tap/click (only one event to avoid double toggle)
floatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.toggle('active');
});
// No separate touchstart – click handles both desktop and mobile

// Close popup when cross button is clicked or touched
closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.remove('active');
});
closeBtn.addEventListener('touchstart', (e) => {
    e.stopPropagation();
    popup.classList.remove('active');
});

// Close popup when tapping/clicking outside
document.addEventListener('click', (e) => {
    if (!floatBtn.contains(e.target) && !popup.contains(e.target)) {
        popup.classList.remove('active');
    }
});
document.addEventListener('touchstart', (e) => {
    if (!floatBtn.contains(e.target) && !popup.contains(e.target)) {
        popup.classList.remove('active');
    }
});