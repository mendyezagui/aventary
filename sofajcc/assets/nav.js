// Mobile nav toggle
document.addEventListener('click', function (e) {
  var t = e.target.closest('.nav-toggle');
  if (t) {
    var menu = document.getElementById('menu');
    if (menu) menu.classList.toggle('open');
  }
});
