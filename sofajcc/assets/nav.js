// Mobile menu toggle + nav scroll shadow
(function () {
  document.addEventListener('click', function (e) {
    if (e.target.closest('#navToggle')) {
      var m = document.getElementById('mobileMenu');
      if (m) m.classList.toggle('hidden');
    }
  });
  var nav = document.getElementById('siteNav');
  if (nav) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 20) { nav.classList.add('shadow-md'); nav.classList.remove('shadow-sm'); }
      else { nav.classList.remove('shadow-md'); nav.classList.add('shadow-sm'); }
    });
  }
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
