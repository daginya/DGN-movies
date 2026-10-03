(function () {
  var D = window.DGN_DATA || { movies: [], servers: [] };
  var app = document.getElementById("app");
  var WL = "dgn_watchlist";
  var QUALITIES = ["4K", "1440p", "1080p", "720p", "480p", "360p"];
  var QLABEL = { "4K": "4K · 2160p", "1440p": "2K · 1440p", "1080p": "Full HD · 1080p", "720p": "HD · 720p", "480p": "SD · 480p", "360p": "Low · 360p" };
  function qrank(q) { var i = QUALITIES.indexOf(q); return i < 0 ? 99 : i; }
  function bestQ(m) { return m.links.map(function (l) { return l.quality; }).sort(function (a, b) { return qrank(a) - qrank(b); })[0] || ""; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rt(m) { var h = Math.floor(m / 60), r = m % 60; return h ? h + "h " + String(r).padStart(2, "0") + "m" : r + "m"; }
  function sc(n) { return Number(n).toFixed(1); }
  function wl() { try { return JSON.parse(localStorage.getItem(WL) || "[]"); } catch (e) { return []; } }
  function setWl(v) { localStorage.setItem(WL, JSON.stringify(v)); }
  function stat(s) { return s === "online" ? "ok" : "warn"; }

  function card(m) {
    return '<a class="card" href="#/movie/' + esc(m.slug) + '">' +
      '<img loading="lazy" src="' + esc(m.poster) + '" alt="' + esc(m.title) + ' poster">' +
      '<div class="chips"><span class="chip g">' + sc(m.score) + '</span><span class="chip">' + m.links.length + ' servers</span></div>' +
      (bestQ(m) ? '<span class="qbadge">' + esc(bestQ(m)) + '</span>' : '') +
      '<div class="cap"><b>' + esc(m.title) + '</b><small>' + m.year + ' · ' + rt(m.runtime) + '</small></div></a>';
  }

  function allGenres() {
    var seen = {}, out = [];
    D.movies.forEach(function (m) { m.genres.forEach(function (g) { if (!seen[g.slug]) { seen[g.slug] = 1; out.push(g); } }); });
    return out.sort(function (a, b) { return a.name.localeCompare(b.name); });
  }


  function services(title) {
    var list = window.DGN_SERVICES || [];
    if (!list.length) return "";
    return '<section class="block"><p class="kicker">Streaming services</p><h2 class="title" style="margin-bottom:6px">' + esc(title) + '</h2>' +
      '<p class="mute" style="margin:0 0 18px;font-size:14px">Official sites for the major platforms. Links open in a new tab.</p><div class="svcs">' +
      list.map(function (x) {
        return '<a class="svc" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer"><span class="svci" style="background:' + esc(x.color) + '">' + esc(x.name.charAt(0)) +
          '</span><span class="svct"><b>' + esc(x.name) + '</b><small>' + esc(x.note) + '</small></span></a>';
      }).join("") + '</div></section>';
  }

  function home() {
    var hero = D.movies.filter(function (m) { return m.featured; })[0] || D.movies[0];
    var trending = D.movies.filter(function (m) { return m.trending; });
    var links = D.movies.reduce(function (n, m) { return n + m.links.length; }, 0);
    var h = "";
    if (hero) {
      h += '<section class="hero"><img src="' + esc(hero.backdrop) + '" alt=""><div class="wrap heroin">' +
        '<p class="kicker">Now streaming on ' + hero.links.length + ' servers</p>' +
        '<h1>' + esc(hero.title) + '</h1><p class="tag">' + esc(hero.tagline) + '</p>' +
        '<div class="meta"><span>' + hero.year + '</span><span>' + esc(hero.rating) + '</span><span>' + rt(hero.runtime) + '</span><span>Score ' + sc(hero.score) + '</span>' +
        hero.genres.map(function (g) { return "<span>" + esc(g.name) + "</span>"; }).join("") + '</div>' +
        '<div class="btns"><a class="btn primary" href="#/movie/' + esc(hero.slug) + '">Watch now</a><a class="btn" href="#/movies">Browse catalog</a></div></div></section>';
    }
    h += '<div class="wrap"><section class="strip"><p class="kicker">Live servers</p><div class="row">' +
      D.servers.map(function (s) {
        return '<span class="srv"><span class="dot" style="background:' + esc(s.accent) + '"></span>' + esc(s.name) +
          ' <span class="dim">' + esc(s.region) + '</span> <span class="' + stat(s.status) + '">' + s.latency + 'ms</span></span>';
      }).join("") + '</div></section>';
    h += services("Where to watch");
    if (trending.length) {
      h += '<section class="block"><p class="kicker">This week</p><h2 class="title">Trending across the grid</h2><div class="rail">' + trending.map(card).join("") + '</div></section>';
    }
    h += '<section class="block two"><div class="vault" style="background-image:url(hero.jpg)"><div><p class="kicker">DGN network</p>' +
      '<h3>One catalog. Every server.</h3><p>' + D.movies.length + ' titles, ' + links + ' mirrors, ' + D.servers.length +
      ' independent streams. Pick a film, then pick the source that is fastest tonight.</p></div></div>' +
      '<div><p class="kicker">Browse by mood</p><div class="moods">' +
      allGenres().slice(0, 8).map(function (g) { return '<a class="mood" href="#/movies?genre=' + esc(g.slug) + '"><b>' + esc(g.name) + '</b><small>Open shelf</small></a>'; }).join("") +
      '</div></div></section>';
    h += '<section class="block"><h2 class="title">The full house</h2><div class="grid">' + D.movies.slice(0, 10).map(card).join("") + '</div></section></div>';
    app.innerHTML = h;
  }

  function catalog(params) {
    var q = (params.get("q") || "").toLowerCase(), genre = params.get("genre") || "", year = params.get("year") || "", server = params.get("server") || "", quality = params.get("quality") || "";
    var list = D.movies.filter(function (m) {
      if (q && (m.title + " " + m.tagline + " " + m.director + " " + m.synopsis).toLowerCase().indexOf(q) < 0) return false;
      if (genre && !m.genres.some(function (g) { return g.slug === genre; })) return false;
      if (year && String(m.year) !== year) return false;
      if (server && !m.links.some(function (l) { return l.code === server; })) return false;
      if (quality && !m.links.some(function (l) { return l.quality === quality; })) return false;
      return true;
    });
    function link(k, v) {
      var p = new URLSearchParams(params);
      if (!v || p.get(k) === v) p.delete(k); else p.set(k, v);
      var s = p.toString(); return "#/movies" + (s ? "?" + s : "");
    }
    var years = Array.from(new Set(D.movies.map(function (m) { return m.year; }))).sort(function (a, b) { return b - a; });
    app.innerHTML = '<div class="wrap page"><p class="kicker">Catalog</p><h1>Every title, every mirror</h1>' +
      '<p class="mute">Filter by genre, year, or the server you want to watch from. Open a film to switch sources live.</p>' +
      '<div class="pills"><a class="pill' + (genre ? "" : " on") + '" href="' + link("genre", "") + '">All genres</a>' +
      allGenres().map(function (g) { return '<a class="pill' + (genre === g.slug ? " on" : "") + '" href="' + link("genre", g.slug) + '">' + esc(g.name) + "</a>"; }).join("") + "</div>" +
      '<div class="pills">' + years.map(function (y) { return '<a class="pill' + (year === String(y) ? " on" : "") + '" href="' + link("year", String(y)) + '">' + y + "</a>"; }).join("") + "</div>" +
      '<div class="pills">' + D.servers.map(function (s) { return '<a class="pill' + (server === s.code ? " on" : "") + '" href="' + link("server", s.code) + '">' + esc(s.name) + "</a>"; }).join("") + "</div>" +
      '<div class="pills"><span class="qlab">Quality</span>' + QUALITIES.map(function (x) { return '<a class="qpill' + (quality === x ? " on" : "") + '" href="' + link("quality", x) + '">' + x + "</a>"; }).join("") + "</div>" +
      '<p class="count">' + list.length + " title" + (list.length === 1 ? "" : "s") + (q ? " for “" + esc(params.get("q")) + "”" : "") + "</p>" +
      (list.length ? '<div class="grid">' + list.map(card).join("") + "</div>" : '<p class="empty">No titles match those filters. Try another shelf.</p>') + services("More places to watch") + "</div>";
  }

  function movie(slug) {
    var m = D.movies.filter(function (x) { return x.slug === slug; })[0];
    if (!m) return notFound();
    var saved = wl().indexOf(m.slug) >= 0;
    var sim = D.movies.filter(function (x) {
      return x.slug !== m.slug && x.genres.some(function (g) { return m.genres.some(function (h) { return h.slug === g.slug; }); });
    }).slice(0, 6);
    document.title = m.title + " · DGN";
    app.innerHTML = '<section class="mhero"><img src="' + esc(m.backdrop) + '" alt=""><div class="wrap mheroin"><img src="' + esc(m.poster) + '" alt="">' +
      '<div><p class="kicker">' + esc(m.country) + " · " + esc(m.director) + '</p><h1>' + esc(m.title) + '</h1><p class="tag" style="color:var(--body);font-size:18px;margin:12px 0 0">' + esc(m.tagline) + '</p>' +
      '<div class="meta"><span>' + m.year + "</span><span>" + esc(m.rating) + "</span><span>" + rt(m.runtime) + "</span><span>" + sc(m.score) + "</span>" +
      m.genres.map(function (g) { return '<a href="#/movies?genre=' + esc(g.slug) + '">' + esc(g.name) + "</a>"; }).join("") + '</div>' +
      '<div class="btns"><button class="btn" id="wl">' + (saved ? "In watchlist" : "Add to watchlist") + '</button></div></div></div></section>' +
      '<div class="wrap layout"><div>' +
      (m.links.length
        ? '<div class="player"><div class="vwrap"><video id="vid" controls playsinline poster="' + esc(m.poster) + '"></video><span class="qbadge big" id="qnow"></span></div><div class="ppanel"><p class="kicker">Quality</p><div class="qrow" id="qrow"></div><p class="mute" id="qlabel" style="font-size:12px;margin:8px 0 18px"></p><div class="phead"><span><span class="kicker">Watch servers</span><br><span id="now"></span></span><span id="info"></span></div><div class="servers" id="srvs"></div></div></div>'
        : '<p class="empty">No active servers for this title yet.</p>') +
      '<p class="syn">' + esc(m.synopsis) + "</p>" +
      (m.cast.length ? '<h2 class="title" style="font-size:24px;margin-top:32px">Cast</h2><ul class="castl">' + m.cast.map(function (c) { return "<li>" + esc(c.name) + "<small>" + esc(c.role) + "</small></li>"; }).join("") + "</ul>" : "") +
      '</div><aside class="side"><p class="kicker">Mirrors</p><ul>' +
      m.links.map(function (l) { return "<li><span>" + esc(l.server) + "<small>" + esc(l.quality) + " · " + esc(l.language) + " · " + esc(l.size) + '</small></span><span class="' + stat(l.status) + '">' + l.latency + "ms</span></li>"; }).join("") +
      "</ul></aside></div>" +
      (sim.length ? '<div class="wrap"><section class="block"><h2 class="title">Because you opened this</h2><div class="grid">' + sim.map(card).join("") + "</div></section></div>" : "");

    document.getElementById("wl").onclick = function () {
      var list = wl(), i = list.indexOf(m.slug);
      if (i >= 0) list.splice(i, 1); else list.unshift(m.slug);
      setWl(list);
      this.textContent = i >= 0 ? "Add to watchlist" : "In watchlist";
    };

    if (!m.links.length) return;
    var vid = document.getElementById("vid"), srvs = document.getElementById("srvs"), qrow = document.getElementById("qrow");
    var links = m.links.slice().sort(function (a, b) { return qrank(a.quality) - qrank(b.quality) || a.latency - b.latency; });
    var avail = {}; links.forEach(function (l) { avail[l.quality] = 1; });
    var curQ = avail["1080p"] ? "1080p" : links[0].quality;
    function pick(idx) {
      var l = links[idx]; curQ = l.quality;
      vid.src = l.url;
      document.getElementById("qnow").textContent = l.quality;
      document.getElementById("qlabel").textContent = QLABEL[l.quality] || l.quality;
      document.getElementById("now").textContent = "Now playing via " + l.server + " · " + l.quality + " · " + l.language;
      document.getElementById("info").textContent = l.size + " · " + l.latency + "ms · " + l.region;
      qrow.innerHTML = QUALITIES.map(function (q) {
        var has = !!avail[q];
        return '<button class="qbtn' + (q === curQ ? " on" : "") + '"' + (has ? ' data-q="' + q + '"' : " disabled") + ' title="' + esc(QLABEL[q]) + (has ? "" : " — not available") + '">' + q + "</button>";
      }).join("");
      srvs.innerHTML = links.map(function (x, i) {
        if (x.quality !== curQ) return "";
        return '<button class="sbtn' + (i === idx ? " on" : "") + '" data-i="' + i + '"><span class="r"><span><span class="dot" style="background:' + esc(x.accent) + '"></span> ' + esc(x.server) +
          '</span><span class="s ' + stat(x.status) + '">' + esc(x.status) + "</span></span><small>" + esc(x.quality) + " · " + esc(x.language) + " · " + esc(x.size) + " · " + x.latency + "ms</small></button>";
      }).join("");
    }
    srvs.onclick = function (e) {
      var b = e.target.closest("button[data-i]");
      if (b) { pick(Number(b.getAttribute("data-i"))); vid.play().catch(function () {}); }
    };
    qrow.onclick = function (e) {
      var b = e.target.closest("button[data-q]");
      if (!b) return;
      var q = b.getAttribute("data-q");
      for (var i = 0; i < links.length; i++) if (links[i].quality === q) { pick(i); break; }
    };
    var start = 0; for (var i = 0; i < links.length; i++) if (links[i].quality === curQ) { start = i; break; }
    pick(start);
  }

  function serversPage() {
    app.innerHTML = '<div class="wrap page"><p class="kicker">Infrastructure</p><h1>Streaming servers</h1>' +
      '<p class="mute">Every title on DGN can be mirrored. Choose the node with the lowest latency, or keep a slower archive copy as backup.</p><div class="scards">' +
      D.servers.map(function (s) {
        var n = D.movies.reduce(function (c, m) { return c + m.links.filter(function (l) { return l.code === s.code; }).length; }, 0);
        return '<a class="scard" href="#/movies?server=' + esc(s.code) + '"><div class="r"><h3><span class="dot" style="background:' + esc(s.accent) + ';width:12px;height:12px"></span> ' + esc(s.name) +
          '</h3><span class="' + stat(s.status) + '">' + esc(s.status) + "</span></div><p>" + esc(s.region) + " · " + s.latency + "ms · " + n + " links</p></a>";
      }).join("") + "</div></div>";
  }

  function watchlist() {
    var slugs = wl(), list = slugs.map(function (s) { return D.movies.filter(function (m) { return m.slug === s; })[0]; }).filter(Boolean);
    app.innerHTML = '<div class="wrap page"><p class="kicker">Private reel</p><h1>Watchlist</h1><p class="mute">Titles you pin stay on this browser.</p>' +
      (list.length ? '<div class="grid" style="margin-top:32px">' + list.map(card).join("") + "</div>" : '<p class="empty">Nothing saved yet. Open a film and add it to the reel.</p>') + "</div>";
  }

  function notFound() {
    app.innerHTML = '<div class="wrap page" style="text-align:center;padding:96px 20px"><p class="kicker">404</p><h1>This reel is missing</h1><p class="mute">The title may have been pulled from the DGN grid.</p><div class="btns" style="justify-content:center"><a class="btn primary" href="#/movies">Return to catalog</a></div></div>';
  }

  function route() {
    var hash = location.hash.replace(/^#/, "") || "/";
    var parts = hash.split("?"), path = parts[0], params = new URLSearchParams(parts[1] || "");
    document.title = "DGN — Movies from every server";
    if (path === "/" || path === "") home();
    else if (path === "/movies") catalog(params);
    else if (path.indexOf("/movie/") === 0) movie(decodeURIComponent(path.slice(7)));
    else if (path === "/servers") serversPage();
    else if (path === "/watchlist") watchlist();
    else notFound();
    window.scrollTo(0, 0);
  }

  document.getElementById("search").onsubmit = function (e) {
    e.preventDefault();
    var q = this.q.value.trim();
    location.hash = q ? "#/movies?q=" + encodeURIComponent(q) : "#/movies";
  };
  window.addEventListener("hashchange", route);
  route();
})();
