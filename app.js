/* DGN Movies — static single-page app. No build step, no server, no database. */
(function () {
  const DATA = window.DGN_DATA || { movies: [], services: [] };
  const app = document.getElementById("app");
  const searchBox = document.getElementById("search");

  const QUALITIES = ["4K", "2100p", "1080p", "720p", "480p", "360p"];
  const WATCH_KEY = "dgn_watchlist";

  let query = "";
  let filters = { genre: "", year: "", quality: "" };
  let playerState = { quality: "All", index: 0 };

  /* ---------- helpers ---------- */
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }

  function runtime(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? h + "h " + String(m).padStart(2, "0") + "m" : m + "m";
  }

  function readList() {
    try {
      return JSON.parse(localStorage.getItem(WATCH_KEY)) || [];
    } catch (error) {
      return [];
    }
  }

  function saved(slug) {
    return readList().indexOf(slug) > -1;
  }

  function toggleSave(slug) {
    const list = readList();
    const at = list.indexOf(slug);
    if (at > -1) list.splice(at, 1);
    else list.push(slug);
    localStorage.setItem(WATCH_KEY, JSON.stringify(list));
    return list.indexOf(slug) > -1;
  }

  function bySlug(slug) {
    return DATA.movies.filter(function (movie) {
      return movie.slug === slug;
    })[0];
  }

  function allGenres() {
    const set = {};
    DATA.movies.forEach(function (movie) {
      movie.genres.forEach(function (genre) {
        set[genre] = true;
      });
    });
    return Object.keys(set).sort();
  }

  function allYears() {
    const set = {};
    DATA.movies.forEach(function (movie) {
      set[movie.year] = true;
    });
    return Object.keys(set).sort().reverse();
  }

  function qualityOrder(quality) {
    const at = QUALITIES.indexOf(quality);
    return at === -1 ? QUALITIES.length : at;
  }

  /* ---------- pieces ---------- */
  function card(movie) {
    return (
      '<a class="card" href="#/movie/' +
      esc(movie.slug) +
      '">' +
      '<img src="' +
      esc(movie.posterUrl) +
      '" alt="' +
      esc(movie.title) +
      ' poster" loading="lazy" />' +
      '<div class="card-overlay"></div>' +
      '<div class="badges"><span class="badge">' +
      movie.score.toFixed(1) +
      '</span><span class="badge dark">' +
      movie.links.length +
      " servers</span></div>" +
      '<div class="card-body"><h3>' +
      esc(movie.title) +
      "</h3><p>" +
      movie.year +
      " · " +
      runtime(movie.runtimeMinutes) +
      "</p></div></a>"
    );
  }

  function serviceCard(service) {
    const initials = service.name
      .replace(/^The\s+/i, "")
      .split(/[\s+]+/)
      .slice(0, 2)
      .map(function (word) {
        return word[0];
      })
      .join("")
      .toUpperCase();
    return (
      '<a class="service" href="' +
      esc(service.url) +
      '" target="_blank" rel="noreferrer">' +
      '<div class="service-dot" style="background:' +
      esc(service.accent) +
      '">' +
      esc(initials) +
      "</div>" +
      "<h3>" +
      esc(service.name) +
      '</h3><p class="cat">' +
      esc(service.category) +
      "</p><p>" +
      esc(service.tagline) +
      '</p><p class="open">Open ↗</p></a>'
    );
  }

  function sectionHead(kicker, title, note) {
    return (
      '<div class="section-head"><div><p class="eyebrow">' +
      esc(kicker) +
      "</p><h2>" +
      esc(title) +
      "</h2></div>" +
      (note ? '<p class="muted">' + esc(note) + "</p>" : "") +
      "</div>"
    );
  }

  /* ---------- pages ---------- */
  function homePage() {
    const hero = DATA.movies.filter(function (movie) {
      return movie.featured;
    })[0] || DATA.movies[0];
    if (!hero) return '<p class="empty">No films yet.</p>';

    const trending = DATA.movies.filter(function (movie) {
      return movie.trending;
    });

    return (
      '<section class="hero">' +
      '<img class="hero-bg" src="' +
      esc(hero.backdropUrl) +
      '" alt="" />' +
      '<div class="hero-scrim"></div>' +
      '<div class="hero-body">' +
      '<p class="eyebrow">Now streaming on ' +
      hero.links.length +
      " servers</p>" +
      "<h1>" +
      esc(hero.title) +
      '</h1><p class="tagline">' +
      esc(hero.tagline) +
      '</p><div class="meta"><span>' +
      hero.year +
      "</span><span>" +
      esc(hero.contentRating) +
      "</span><span>" +
      runtime(hero.runtimeMinutes) +
      "</span><span>Score " +
      hero.score.toFixed(1) +
      "</span><span>" +
      esc(hero.genres.join(" · ")) +
      '</span></div><div class="hero-actions">' +
      '<a class="btn btn-light" href="#/movie/' +
      esc(hero.slug) +
      '">Watch now</a>' +
      '<a class="btn btn-ghost" href="#/catalog">Browse catalog</a>' +
      "</div></div></section>" +
      '<section class="section">' +
      sectionHead("This week", "Trending across the grid") +
      '<div class="rail">' +
      trending.map(card).join("") +
      "</div></section>" +
      '<section class="section" id="services">' +
      sectionHead("Beyond DGN", "Browse every service", DATA.services.length + " services") +
      '<div class="services">' +
      DATA.services.map(serviceCard).join("") +
      "</div></section>" +
      '<section class="section">' +
      sectionHead("The full house", "All titles", DATA.movies.length + " films") +
      '<div class="grid">' +
      DATA.movies.map(card).join("") +
      "</div></section>"
    );
  }

  function catalogPage() {
    const results = DATA.movies.filter(function (movie) {
      const haystack = (
        movie.title +
        " " +
        movie.director +
        " " +
        movie.tagline +
        " " +
        movie.synopsis
      ).toLowerCase();
      if (query && haystack.indexOf(query.toLowerCase()) === -1) return false;
      if (filters.genre && movie.genres.indexOf(filters.genre) === -1) return false;
      if (filters.year && String(movie.year) !== filters.year) return false;
      if (filters.quality) {
        const has = movie.links.some(function (link) {
          return link.quality === filters.quality;
        });
        if (!has) return false;
      }
      return true;
    });

    function chip(label, active, action, value) {
      return (
        '<button class="chip' +
        (active ? " on" : "") +
        '" data-action="' +
        action +
        '" data-value="' +
        esc(value) +
        '">' +
        esc(label) +
        "</button>"
      );
    }

    return (
      '<section class="section" style="margin-top:2.5rem">' +
      '<p class="eyebrow">Catalog</p><h2>Every title, every mirror</h2>' +
      '<p class="muted">Filter by genre, year or quality — then pick the server that streams fastest.</p>' +
      '<div class="chips">' +
      chip("All genres", !filters.genre, "genre", "") +
      allGenres()
        .map(function (genre) {
          return chip(genre, filters.genre === genre, "genre", genre);
        })
        .join("") +
      "</div>" +
      '<div class="chips">' +
      chip("All years", !filters.year, "year", "") +
      allYears()
        .map(function (year) {
          return chip(year, filters.year === year, "year", year);
        })
        .join("") +
      "</div>" +
      '<div class="chips">' +
      chip("All qualities", !filters.quality, "quality", "") +
      QUALITIES.map(function (quality) {
        return chip(quality, filters.quality === quality, "quality", quality);
      }).join("") +
      "</div>" +
      '<p class="muted">' +
      results.length +
      " title" +
      (results.length === 1 ? "" : "s") +
      (query ? " for “" + esc(query) + "”" : "") +
      "</p>" +
      (results.length
        ? '<div class="grid" style="margin-top:1.25rem">' + results.map(card).join("") + "</div>"
        : '<p class="empty">No titles match those filters.</p>') +
      "</section>"
    );
  }

  function moviePage(slug) {
    const movie = bySlug(slug);
    if (!movie) return '<p class="empty">That reel is missing. <a href="#/catalog">Back to catalog</a></p>';

    const links = movie.links.slice().sort(function (a, b) {
      return qualityOrder(a.quality) - qualityOrder(b.quality) || a.server.latencyMs - b.server.latencyMs;
    });

    const qualities = QUALITIES.filter(function (quality) {
      return links.some(function (link) {
        return link.quality === quality;
      });
    });

    const visible =
      playerState.quality === "All"
        ? links
        : links.filter(function (link) {
            return link.quality === playerState.quality;
          });

    const current = visible[playerState.index] || visible[0] || links[0];

    const qualityChips =
      qualities.length > 1
        ? '<div class="chips"><span class="eyebrow" style="margin:0;align-self:center">Quality</span>' +
          ["All"].concat(qualities)
            .map(function (quality) {
              return (
                '<button class="chip' +
                (playerState.quality === quality ? " on" : "") +
                '" data-action="pquality" data-value="' +
                esc(quality) +
                '">' +
                esc(quality) +
                "</button>"
              );
            })
            .join("") +
          "</div>"
        : "";

    const servers = visible
      .map(function (link) {
        const on = current && link === current;
        return (
          '<button class="server' +
          (on ? " on" : "") +
          '" data-action="server" data-value="' +
          esc(link.server.name + "|" + link.quality + "|" + link.fileSize) +
          '">' +
          '<div class="top"><span class="name"><span class="dot" style="background:' +
          esc(link.server.accent) +
          '"></span>' +
          esc(link.server.name) +
          '</span><span class="q">' +
          esc(link.quality) +
          "</span></div>" +
          '<p class="sub">' +
          esc(link.language) +
          " · " +
          esc(link.fileSize) +
          " · " +
          link.server.latencyMs +
          "ms</p></button>"
        );
      })
      .join("");

    return (
      '<section class="detail-hero">' +
      '<img class="hero-bg" src="' +
      esc(movie.backdropUrl) +
      '" alt="" /><div class="hero-scrim"></div>' +
      '<div class="detail-inner"><img class="poster" src="' +
      esc(movie.posterUrl) +
      '" alt="' +
      esc(movie.title) +
      ' poster" />' +
      "<div><p class=\"eyebrow\">" +
      esc(movie.country) +
      " · " +
      esc(movie.director) +
      "</p><h1>" +
      esc(movie.title) +
      '</h1><p class="tagline">' +
      esc(movie.tagline) +
      '</p><div class="meta"><span>' +
      movie.year +
      "</span><span>" +
      esc(movie.contentRating) +
      "</span><span>" +
      runtime(movie.runtimeMinutes) +
      "</span><span>" +
      movie.score.toFixed(1) +
      "</span><span>" +
      esc(movie.genres.join(" · ")) +
      '</span></div><div class="hero-actions"><button class="btn btn-light" data-action="save" data-value="' +
      esc(movie.slug) +
      '">' +
      (saved(movie.slug) ? "In watchlist" : "Add to watchlist") +
      '</button><a class="btn btn-ghost" href="#/catalog">Back to catalog</a></div>' +
      "</div></div></section>" +
      '<div class="columns"><div><div class="player">' +
      '<video controls playsinline poster="' +
      esc(movie.posterUrl) +
      '" src="' +
      esc(current ? current.url : "") +
      '"></video>' +
      '<div class="player-body"><p class="eyebrow">Watch servers</p>' +
      '<p class="muted">Now playing via ' +
      esc(current ? current.server.name : "—") +
      " · " +
      esc(current ? current.quality : "—") +
      " · " +
      esc(current ? current.language : "—") +
      " · " +
      esc(current ? current.fileSize : "—") +
      "</p>" +
      qualityChips +
      '<div class="server-grid">' +
      servers +
      "</div></div></div>" +
      '<p class="synopsis">' +
      esc(movie.synopsis) +
      "</p>" +
      (movie.cast.length
        ? "<h2>Cast</h2><ul class=\"cast\">" +
          movie.cast
            .map(function (person) {
              return (
                "<li><strong>" +
                esc(person.name) +
                "</strong><span>" +
                esc(person.role) +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
        : "") +
      "</div>" +
      '<aside><div class="panel"><h3>Mirrors</h3><ul>' +
      links
        .map(function (link) {
          return (
            "<li><strong>" +
            esc(link.server.name) +
            "</strong><span>" +
            esc(link.quality) +
            " · " +
            esc(link.language) +
            " · " +
            esc(link.fileSize) +
            " · " +
            link.server.latencyMs +
            "ms</span></li>"
          );
        })
        .join("") +
      "</ul></div></aside></div>"
    );
  }

  function watchlistPage() {
    const list = readList();
    const movies = DATA.movies.filter(function (movie) {
      return list.indexOf(movie.slug) > -1;
    });
    return (
      '<section class="section" style="margin-top:2.5rem">' +
      '<p class="eyebrow">Private reel</p><h2>Watchlist</h2>' +
      '<p class="muted">Saved in this browser only — no account needed.</p>' +
      (movies.length
        ? '<div class="grid" style="margin-top:1.5rem">' + movies.map(card).join("") + "</div>"
        : '<p class="empty">Nothing saved yet. Open a film and add it to the reel.</p>') +
      "</section>"
    );
  }

  function servicesPage() {
    return (
      '<section class="section" style="margin-top:2.5rem">' +
      sectionHead("Beyond DGN", "Browse every service", DATA.services.length + " services") +
      '<div class="services">' +
      DATA.services.map(serviceCard).join("") +
      "</div></section>"
    );
  }

  /* ---------- router ---------- */
  function render() {
    const hash = window.location.hash || "#/";
    let html;

    if (hash.indexOf("#/movie/") === 0) {
      html = moviePage(hash.slice("#/movie/".length));
    } else if (hash === "#/catalog") {
      html = catalogPage();
    } else if (hash === "#/services") {
      html = servicesPage();
    } else if (hash === "#/watchlist") {
      html = watchlistPage();
    } else {
      html = homePage();
    }

    app.innerHTML = html;
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  window.addEventListener("hashchange", function () {
    playerState = { quality: "All", index: 0 };
    render();
  });

  app.addEventListener("click", function (event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    const value = target.getAttribute("data-value") || "";

    if (action === "genre" || action === "year" || action === "quality") {
      filters[action] = value;
      render();
    } else if (action === "pquality") {
      playerState = { quality: value, index: 0 };
      render();
    } else if (action === "server") {
      const parts = value.split("|");
      const slug = window.location.hash.slice("#/movie/".length);
      const movie = bySlug(slug);
      if (!movie) return;
      const links = movie.links.slice().sort(function (a, b) {
        return qualityOrder(a.quality) - qualityOrder(b.quality) || a.server.latencyMs - b.server.latencyMs;
      });
      const visible =
        playerState.quality === "All"
          ? links
          : links.filter(function (link) {
              return link.quality === playerState.quality;
            });
      playerState.index = visible.findIndex(function (link) {
        return link.server.name === parts[0] && link.quality === parts[1] && link.fileSize === parts[2];
      });
      render();
    } else if (action === "save") {
      toggleSave(value);
      render();
    }
  });

  searchBox.addEventListener("input", function (event) {
    query = event.target.value.trim();
    if (window.location.hash !== "#/catalog") {
      window.location.hash = "#/catalog";
    } else {
      render();
    }
  });

  render();
})();
