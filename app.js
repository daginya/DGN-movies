/* DGN Movies — streaming interface. Static, no build step, no server. */
(function () {
  const DATA = window.DGN_DATA || { movies: [], services: [] };
  const app = document.getElementById("app");
  const searchBox = document.getElementById("search");
  const navLinks = document.getElementById("navlinks");

  const QUALITIES = ["4K", "2100p", "1080p", "720p", "480p", "360p"];
  const WATCH_KEY = "dgn_watchlist";

  let query = "";
  let filters = { genre: "", year: "", quality: "" };
  let playerState = { quality: "All", index: 0 };
  let slide = 0;
  let timer = null;

  /* ---------------- helpers ---------------- */
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
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

  function qualityRank(quality) {
    const at = QUALITIES.indexOf(quality);
    return at === -1 ? QUALITIES.length : at;
  }

  function hasQuality(movie, quality) {
    return movie.links.some(function (link) {
      return link.quality === quality;
    });
  }

  function bestQuality(movie) {
    const list = movie.links
      .map(function (link) {
        return link.quality;
      })
      .sort(function (a, b) {
        return qualityRank(a) - qualityRank(b);
      });
    return list[0] || "1080p";
  }

  /* ---------------- pieces ---------------- */
  function card(movie) {
    return (
      '<a class="card" href="#/movie/' +
      esc(movie.slug) +
      '">' +
      '<img src="' +
      esc(movie.posterUrl) +
      '" alt="' +
      esc(movie.title) +
      '" loading="lazy" />' +
      '<div class="badges"><span class="badge lime">' +
      esc(bestQuality(movie)) +
      '</span><span class="badge">' +
      movie.score.toFixed(1) +
      "</span></div>" +
      '<div class="card-hover"><div class="play">▶</div><strong>' +
      esc(movie.title) +
      "</strong><span>" +
      movie.year +
      " · " +
      runtime(movie.runtimeMinutes) +
      " · " +
      movie.links.length +
      " servers</span></div></a>"
    );
  }

  function row(title, movies, moreHref) {
    if (!movies.length) return "";
    return (
      '<section class="section"><div class="section-head"><h2>' +
      esc(title) +
      "</h2>" +
      (moreHref ? '<a class="more" href="' + moreHref + '">See all ›</a>' : "") +
      '</div><div class="row">' +
      movies.map(card).join("") +
      "</div></section>"
    );
  }

  function providerTile(service) {
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
      '<a class="provider" href="' +
      esc(service.url) +
      '" target="_blank" rel="noreferrer">' +
      '<div class="dot" style="background:' +
      esc(service.accent) +
      '">' +
      esc(initials) +
      "</div><strong>" +
      esc(service.name) +
      "</strong><span>" +
      esc(service.category) +
      "</span></a>"
    );
  }

  /* ---------------- pages ---------------- */
  function heroSlides(movies) {
    return movies
      .map(function (movie, index) {
        return (
          '<div class="hero-slide' +
          (index === slide ? " on" : "") +
          '">' +
          '<img class="hero-bg" src="' +
          esc(movie.backdropUrl) +
          '" alt="" />' +
          '<div class="hero-scrim"></div>' +
          '<div class="hero-body"><div>' +
          '<span class="tag-pill">▶ Featured · ' +
          esc(bestQuality(movie)) +
          "</span>" +
          "<h1>" +
          esc(movie.title) +
          '</h1><p class="tagline">' +
          esc(movie.tagline) +
          '</p><div class="meta-row">' +
          '<span class="meta-chip">' +
          movie.year +
          '</span><span class="meta-chip">' +
          esc(movie.contentRating) +
          '</span><span class="meta-chip">' +
          runtime(movie.runtimeMinutes) +
          '</span><span class="meta-chip">★ ' +
          movie.score.toFixed(1) +
          "</span>" +
          movie.genres
            .slice(0, 2)
            .map(function (genre) {
              return '<span class="meta-chip">' + esc(genre) + "</span>";
            })
            .join("") +
          '<span class="meta-chip q">' +
          movie.links.length +
          " servers</span></div>" +
          '<div class="btn-row"><a class="btn btn-accent" href="#/movie/' +
          esc(movie.slug) +
          '">▶ Watch Now</a>' +
          '<a class="btn btn-glass" href="#/movie/' +
          esc(movie.slug) +
          '">More Info</a></div>' +
          "</div></div></div>"
        );
      })
      .join("");
  }

  function homePage() {
    const featured = DATA.movies.filter(function (movie) {
      return movie.featured || movie.trending;
    }).slice(0, 5);
    const slides = featured.length ? featured : DATA.movies.slice(0, 5);

    const trending = DATA.movies.filter(function (movie) {
      return movie.trending;
    });
    const newest = DATA.movies.slice().sort(function (a, b) {
      return b.year - a.year;
    });
    const top = DATA.movies.slice().sort(function (a, b) {
      return b.score - a.score;
    });
    const ultra = DATA.movies.filter(function (movie) {
      return hasQuality(movie, "4K");
    });

    return (
      '<section class="hero">' +
      heroSlides(slides) +
      '<div class="dots">' +
      slides
        .map(function (movie, index) {
          return (
            '<button data-action="slide" data-value="' +
            index +
            '" class="' +
            (index === slide ? "on" : "") +
            '" aria-label="Slide ' +
            (index + 1) +
            '"></button>'
          );
        })
        .join("") +
      "</div></section>" +

      '<section class="section"><div class="section-head"><h2>Watch on your favorite platforms</h2>' +
      '<a class="more" href="#/services">All platforms ›</a></div><div class="providers">' +
      DATA.services.map(providerTile).join("") +
      "</div></section>" +

      row("Trending Now", trending, "#/catalog") +
      row("New Releases", newest.slice(0, 12), "#/catalog") +
      row("Top Rated", top.slice(0, 12), "#/catalog") +
      row("In 4K Ultra HD", ultra, "#/catalog") +

      '<section class="section"><div class="section-head"><h2>Everything on DGN</h2>' +
      '<a class="more" href="#/catalog">Browse ›</a></div><div class="grid">' +
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
      if (filters.quality && !hasQuality(movie, filters.quality)) return false;
      return true;
    });

    function options(values, selected, label) {
      return (
        '<option value="">' +
        esc(label) +
        "</option>" +
        values
          .map(function (value) {
            return (
              '<option value="' +
              esc(value) +
              '"' +
              (String(selected) === String(value) ? " selected" : "") +
              ">" +
              esc(value) +
              "</option>"
            );
          })
          .join("")
      );
    }

    return (
      '<section class="section" style="margin-top:2.25rem">' +
      '<div class="section-head"><h2 style="font-size:1.85rem">Movies</h2>' +
      '<span class="muted">' +
      results.length +
      " title" +
      (results.length === 1 ? "" : "s") +
      "</span></div>" +
      '<div class="filter-bar">' +
      '<select data-action="filter" data-value="genre">' +
      options(allGenres(), filters.genre, "All genres") +
      "</select>" +
      '<select data-action="filter" data-value="year">' +
      options(allYears(), filters.year, "All years") +
      "</select>" +
      '<select data-action="filter" data-value="quality">' +
      options(QUALITIES, filters.quality, "All qualities") +
      "</select>" +
      '<div class="chips" style="margin-left:auto">' +
      ["4K", "2100p", "1080p", "720p", "480p", "360p"]
        .map(function (quality) {
          return (
            '<button class="chip' +
            (filters.quality === quality ? " on" : "") +
            '" data-action="quality" data-value="' +
            quality +
            '">' +
            quality +
            "</button>"
          );
        })
        .join("") +
      "</div></div>" +
      (results.length
        ? '<div class="grid">' + results.map(card).join("") + "</div>"
        : '<p class="empty">No titles match those filters.</p>') +
      "</section>"
    );
  }

  function moviePage(slug) {
    const movie = bySlug(slug);
    if (!movie)
      return '<p class="empty">That title is missing. <a href="#/catalog" style="color:#95ff50">Back to movies</a></p>';

    const links = movie.links.slice().sort(function (a, b) {
      return (
        qualityRank(a.quality) - qualityRank(b.quality) ||
        a.server.latencyMs - b.server.latencyMs
      );
    });

    const qualities = QUALITIES.filter(function (quality) {
      return hasQuality(movie, quality);
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
        ? '<div class="chips" style="margin:1rem 0">' +
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

    return (
      '<section class="detail-hero">' +
      '<img class="hero-bg" src="' +
      esc(movie.backdropUrl) +
      '" alt="" /><div class="hero-scrim"></div>' +
      '<div class="detail-inner"><img class="poster" src="' +
      esc(movie.posterUrl) +
      '" alt="' +
      esc(movie.title) +
      ' poster" /><div>' +
      '<span class="tag-pill">' +
      esc(movie.genres.join(" · ")) +
      "</span>" +
      "<h1>" +
      esc(movie.title) +
      '</h1><p class="tagline">' +
      esc(movie.tagline) +
      '</p><div class="meta-row">' +
      '<span class="meta-chip">' +
      movie.year +
      '</span><span class="meta-chip">' +
      esc(movie.contentRating) +
      '</span><span class="meta-chip">' +
      runtime(movie.runtimeMinutes) +
      '</span><span class="meta-chip">★ ' +
      movie.score.toFixed(1) +
      '</span><span class="meta-chip q">' +
      movie.links.length +
      ' servers</span></div><div class="btn-row">' +
      '<a class="btn btn-accent" href="#player">▶ Play Now</a>' +
      '<button class="btn btn-glass" data-action="save" data-value="' +
      esc(movie.slug) +
      '">' +
      (saved(movie.slug) ? "✓ In My List" : "+ My List") +
      '</button></div></div></div></section>' +

      '<div class="columns"><div id="player">' +
      '<div class="player"><video controls playsinline poster="' +
      esc(movie.posterUrl) +
      '" src="' +
      esc(current ? current.url : "") +
      '"></video><div class="player-body">' +
      '<p class="tag-pill" style="margin-bottom:.85rem">Now streaming · ' +
      esc(current ? current.server.name : "—") +
      " · " +
      esc(current ? current.quality : "—") +
      "</p>" +
      qualityChips +
      '<div class="server-grid">' +
      visible
        .map(function (link) {
          const on = current && link === current;
          return (
            '<button class="server' +
            (on ? " on" : "") +
            '" data-action="server" data-value="' +
            esc(link.server.name + "|" + link.quality + "|" + link.fileSize) +
            '"><div class="top"><span class="name"><span class="dot-sm" style="background:' +
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
        .join("") +
      "</div></div></div>" +
      '<p class="synopsis">' +
      esc(movie.synopsis) +
      "</p>" +
      (movie.cast.length
        ? "<h2 style=\"margin-top:2rem;font-size:1.35rem\">Cast</h2><ul class=\"cast\">" +
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
      '<aside><div class="panel"><h3>Movie Info</h3><ul>' +
      "<li><strong>Director</strong><span>" +
      esc(movie.director) +
      "</span></li>" +
      "<li><strong>Country</strong><span>" +
      esc(movie.country) +
      "</span></li>" +
      "<li><strong>Runtime</strong><span>" +
      runtime(movie.runtimeMinutes) +
      "</span></li>" +
      "<li><strong>Rating</strong><span>" +
      esc(movie.contentRating) +
      " · " +
      movie.score.toFixed(1) +
      "/10</span></li>" +
      "<li><strong>Available in</strong><span>" +
      esc(qualities.join(", ")) +
      "</span></li>" +
      "</ul></div>" +
      '<div class="panel" style="margin-top:1.15rem"><h3>Servers</h3><ul>' +
      links
        .map(function (link) {
          return (
            "<li><strong>" +
            esc(link.server.name) +
            "</strong><span>" +
            esc(link.quality) +
            " · " +
            esc(link.fileSize) +
            " · " +
            link.server.latencyMs +
            "ms</span></li>"
          );
        })
        .join("") +
      "</ul></div></aside></div>" +

      row(
        "More Like This",
        DATA.movies.filter(function (other) {
          return (
            other.slug !== movie.slug &&
            other.genres.some(function (genre) {
              return movie.genres.indexOf(genre) > -1;
            })
          );
        }).slice(0, 10),
      )
    );
  }

  function watchlistPage() {
    const list = readList();
    const movies = DATA.movies.filter(function (movie) {
      return list.indexOf(movie.slug) > -1;
    });
    return (
      '<section class="section" style="margin-top:2.25rem">' +
      '<div class="section-head"><h2 style="font-size:1.85rem">My List</h2></div>' +
      '<p class="muted">Saved in this browser — no account needed.</p>' +
      (movies.length
        ? '<div class="grid" style="margin-top:1.5rem">' + movies.map(card).join("") + "</div>"
        : '<p class="empty">Nothing saved yet. Open a film and press “+ My List”.</p>') +
      "</section>"
    );
  }

  function servicesPage() {
    return (
      '<section class="section" style="margin-top:2.25rem">' +
      '<div class="section-head"><h2 style="font-size:1.85rem">Streaming Platforms</h2>' +
      '<span class="muted">' +
      DATA.services.length +
      " platforms</span></div>" +
      '<p class="muted">The rest of the streaming world, gathered in one place.</p>' +
      '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));margin-top:1.5rem">' +
      DATA.services.map(providerTile).join("") +
      "</div></section>"
    );
  }

  /* ---------------- router ---------------- */
  function setActiveNav(route) {
    Array.prototype.forEach.call(navLinks.querySelectorAll("a"), function (link) {
      link.classList.toggle("on", link.getAttribute("data-route") === route);
    });
  }

  function render() {
    const hash = window.location.hash || "#/";
    let html;
    let route = "/";

    if (hash.indexOf("#/movie/") === 0) {
      html = moviePage(hash.slice("#/movie/".length));
      route = "/catalog";
    } else if (hash === "#/catalog") {
      html = catalogPage();
      route = "/catalog";
    } else if (hash === "#/services") {
      html = servicesPage();
      route = "/services";
    } else if (hash === "#/watchlist") {
      html = watchlistPage();
      route = "/watchlist";
    } else {
      html = homePage();
      route = "/";
    }

    app.innerHTML = html;
    setActiveNav(route);

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    if (route === "/") {
      const slides = app.querySelectorAll(".hero-slide").length;
      if (slides > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = setInterval(function () {
          slide = (slide + 1) % slides;
          const nodes = app.querySelectorAll(".hero-slide");
          const dots = app.querySelectorAll(".dots button");
          Array.prototype.forEach.call(nodes, function (node, index) {
            node.classList.toggle("on", index === slide);
          });
          Array.prototype.forEach.call(dots, function (node, index) {
            node.classList.toggle("on", index === slide);
          });
        }, 6500);
      }
    }
  }

  window.addEventListener("hashchange", function () {
    playerState = { quality: "All", index: 0 };
    slide = 0;
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  });

  app.addEventListener("click", function (event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    const value = target.getAttribute("data-value") || "";

    if (action === "slide") {
      slide = Number(value) || 0;
      render();
    } else if (action === "filter") {
      return;
    } else if (action === "quality") {
      filters.quality = filters.quality === value ? "" : value;
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
        return qualityRank(a.quality) - qualityRank(b.quality) || a.server.latencyMs - b.server.latencyMs;
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

  app.addEventListener("change", function (event) {
    const target = event.target.closest("[data-action='filter']");
    if (!target) return;
    filters[target.getAttribute("data-value")] = target.value;
    render();
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
