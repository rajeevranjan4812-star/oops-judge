(() => {
  const repositoryLink = document.querySelector(".repository-link--social");
  if (repositoryLink) {
    const setRepositoryExpanded = expanded => {
      repositoryLink.dataset.expanded = String(expanded);
    };
    repositoryLink.addEventListener("pointerenter", event => {
      if (event.pointerType !== "touch") setRepositoryExpanded(true);
    });
    repositoryLink.addEventListener("pointerleave", () => {
      if (!repositoryLink.contains(document.activeElement)) setRepositoryExpanded(false);
    });
    repositoryLink.addEventListener("focusin", () => setRepositoryExpanded(true));
    repositoryLink.addEventListener("focusout", event => {
      if (!repositoryLink.contains(event.relatedTarget)) setRepositoryExpanded(false);
    });
  }

  const authMenu = document.querySelector(".home-auth");
  if (authMenu) {
    const authButton = authMenu.querySelector(".home-auth__button");
    const authPanel = authMenu.querySelector(".home-auth__panel");

    const isFile = window.location.protocol === "file:";
    const url = p => {
      if (isFile) {
        const clean = p.replace(/^\//, "") || "index";
        const query = clean.includes("?") ? "?" + clean.split("?")[1] : "";
        const base = clean.split("?")[0];
        return "./" + (base.endsWith(".html") ? base : base + ".html") + query;
      }
      return p;
    };

    function syncHomeAuthState() {
      let user = null;
      try {
        user = JSON.parse(localStorage.getItem("oops_session") || "null");
      } catch (e) {
        user = null;
      }

      if (user && (user.username || user.name)) {
        const displayName = user.name || user.username || "Coder";
        const handle = user.username || (user.email ? user.email.split("@")[0] : "coder");
        const initial = (displayName.charAt(0) || "U").toUpperCase();
        const avatarSrc = user.picture || user.avatar || "";

        authButton.setAttribute("aria-label", `Account: ${displayName}`);
        if (avatarSrc) {
          authButton.innerHTML = `<img src="${avatarSrc}" alt="${displayName}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;display:block;">`;
        } else {
          authButton.innerHTML = `<span style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#784bff,#26d7f4);color:#fff;font-size:12px;font-weight:700;display:grid;place-items:center;">${initial}</span>`;
        }

        if (authPanel) {
          authPanel.innerHTML = `
            <div class="home-auth__user-pill">
              <div class="home-auth__avatar">
                ${avatarSrc ? `<img src="${avatarSrc}" alt="${displayName}">` : `<span>${initial}</span>`}
              </div>
              <div class="home-auth__user-meta">
                <span class="home-auth__user-name">${displayName}</span>
                <span class="home-auth__user-handle">@${handle}</span>
              </div>
            </div>
            <div class="home-auth__actions" style="display:flex;flex-direction:column;gap:6px">
              <a class="home-auth__link" href="${url('/practice')}">Practice IDE</a>
              <a class="home-auth__link" href="${url('/profile')}">Profile &amp; Stats</a>
              <button class="home-auth__link home-auth__link--logout" type="button" id="home-logout-btn">Log out</button>
            </div>
          `;
        }
      } else {
        authButton.setAttribute("aria-label", "Account options");
        authButton.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.7"/>
            <path d="M4.8 20c.7-3.3 3.2-5.1 7.2-5.1s6.5 1.8 7.2 5.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        `;
        if (authPanel) {
          authPanel.innerHTML = `
            <p class="home-auth__prompt">Join Code-Karo</p>
            <div class="home-auth__actions">
              <a class="home-auth__link" href="${url('/auth?auth=signup')}">Sign up</a>
              <a class="home-auth__link" href="${url('/auth')}">Log in</a>
            </div>
          `;
        }
      }
    }

    syncHomeAuthState();
    window.addEventListener("storage", syncHomeAuthState);

    const setAuthMenuOpen = open => {
      authButton.setAttribute("aria-expanded", String(open));
      authMenu.dataset.open = String(open);
    };
    setAuthMenuOpen(false);
    authButton.addEventListener("click", () => {
      setAuthMenuOpen(authMenu.dataset.open !== "true");
    });
    if (authPanel) {
      authPanel.addEventListener("click", event => {
        const logoutButton = event.target.closest("#home-logout-btn");
        if (!logoutButton) return;

        localStorage.removeItem("oops_session");
        localStorage.removeItem("ck_user");
        syncHomeAuthState();
        setAuthMenuOpen(false);
        authButton.focus();
      });
    }
    authMenu.addEventListener("focusout", event => {
      if (!authMenu.contains(event.relatedTarget)) setAuthMenuOpen(false);
    });
    document.addEventListener("click", event => {
      if (!authMenu.contains(event.target)) setAuthMenuOpen(false);
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && authMenu.dataset.open === "true") {
        setAuthMenuOpen(false);
        authButton.focus();
      }
    });
  }

  // If viewing over file:// protocol, ensure relative links work without 404
  if (window.location.protocol === "file:") {
    document.querySelectorAll("a[href^='/']").forEach(a => {
      const href = a.getAttribute("href");
      if (!href || href.startsWith("//")) return;
      const clean = href.replace(/^\//, "") || "index";
      const hash = clean.includes("#") ? "#" + clean.split("#")[1] : "";
      const pathOnly = clean.split("#")[0].split("?")[0];
      const search = clean.includes("?") ? "?" + clean.split("?")[1].split("#")[0] : "";
      const target = pathOnly ? (pathOnly.endsWith(".html") ? pathOnly : pathOnly + ".html") : "index.html";
      a.setAttribute("href", "./" + target + search + hash);
    });
  }

  const wrapper = document.querySelector("[data-footer-contact]");
  if (wrapper) {
    const button = wrapper.querySelector("button");
    const menu = wrapper.querySelector("#footer-contact-menu");
    let lockedOpen = false;

    function setOpen(open) {
      wrapper.dataset.open = String(open);
      button.setAttribute("aria-expanded", String(open));
    }

    wrapper.addEventListener("pointerenter", () => {
      if (!lockedOpen) setOpen(true);
    });

    wrapper.addEventListener("pointerleave", () => {
      if (!lockedOpen && !wrapper.contains(document.activeElement)) setOpen(false);
    });

    wrapper.addEventListener("focusin", () => setOpen(true));
    wrapper.addEventListener("focusout", event => {
      if (!wrapper.contains(event.relatedTarget) && !lockedOpen) setOpen(false);
    });

    button.addEventListener("click", () => {
      lockedOpen = !lockedOpen;
      setOpen(lockedOpen);
    });

    document.addEventListener("pointerdown", event => {
      if (!wrapper.contains(event.target)) {
        lockedOpen = false;
        setOpen(false);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && wrapper.dataset.open === "true") {
        lockedOpen = false;
        setOpen(false);
        button.focus();
      }
    });

    if (menu) {
      fetch("/team.json")
        .then(res => {
          if (!res.ok) throw new Error("Failed to load team data");
          return res.json();
        })
        .then(team => {
          if (!Array.isArray(team) || !team.length) return;
          menu.textContent = "";
          team.forEach(member => {
            const row = document.createElement("div");
            row.className = "footer-contact-member";

            const name = document.createElement("span");
            name.className = "footer-contact-member__name";
            name.textContent = member.name;
            row.appendChild(name);

            const links = document.createElement("div");
            links.className = "footer-contact-member__links";

            if (member.linkedin) {
              const li = document.createElement("a");
              li.href = member.linkedin;
              li.target = "_blank";
              li.rel = "noopener noreferrer";
              li.className = "footer-contact-member__icon";
              li.setAttribute("aria-label", `${member.name} on LinkedIn`);
              li.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.44c.98 0 1.79-.77 1.79-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>';
              li.addEventListener("click", () => {
                lockedOpen = false;
                setOpen(false);
              });
              links.appendChild(li);
            }

            if (member.github) {
              const gh = document.createElement("a");
              gh.href = member.github;
              gh.target = "_blank";
              gh.rel = "noopener noreferrer";
              gh.className = "footer-contact-member__icon";
              gh.setAttribute("aria-label", `${member.name} on GitHub`);
              gh.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.53v-2.08c-3.1.67-3.75-1.32-3.75-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.76 2.68 3.76 2.03.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.54.23 2.68.11 2.96.72.78 1.15 1.77 1.15 2.99 0 4.29-2.61 5.24-5.1 5.51.4.35.75 1.02.75 2.06V22c0 .29.2.63.76.53A11.1 11.1 0 0 0 12 .9Z"/></svg>';
              gh.addEventListener("click", () => {
                lockedOpen = false;
                setOpen(false);
              });
              links.appendChild(gh);
            }

            row.appendChild(links);
            menu.appendChild(row);
          });
        })
        .catch(() => {});
    }
  }

  const problemsCountEl = document.querySelector("[data-footer-problems]");
  if (problemsCountEl) {
    fetch("/api/problems")
      .then(res => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then(data => {
        const count = Array.isArray(data?.problems) ? data.problems.length : null;
        if (typeof count === "number" && count > 0) {
          problemsCountEl.textContent = `${count} Java problems`;
          problemsCountEl.hidden = false;
        } else {
          problemsCountEl.hidden = true;
        }
      })
      .catch(() => {
        problemsCountEl.hidden = true;
      });
  }

  const backToTop = document.querySelector("[data-back-to-top]");
  if (backToTop) {
    backToTop.addEventListener("click", event => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (history.replaceState) {
        history.replaceState(null, "", window.location.pathname);
      }
    });
  }

  const eyes = document.querySelector("[data-follow-eyes]");
  if (eyes && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const pupils = [...eyes.querySelectorAll(".footer-follow-eye__pupil")];
    window.addEventListener("pointermove", event => {
      if (event.pointerType === "touch") return;
      pupils.forEach(pupil => {
        const eye = pupil.parentElement;
        const bounds = eye.getBoundingClientRect();
        const maxDistance = Math.max(0, (bounds.width - pupil.offsetWidth) / 2 * .8);
        const dx = event.clientX - (bounds.left + bounds.width / 2);
        const dy = event.clientY - (bounds.top + bounds.height / 2);
        const distance = Math.hypot(dx, dy);
        const scale = distance > maxDistance ? maxDistance / distance : 1;
        pupil.style.transform = `translate3d(${dx * scale}px, ${dy * scale}px, 0)`;
      });
    }, { passive: true });

    window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      eyes.classList.add("is-blinking");
      window.setTimeout(() => eyes.classList.remove("is-blinking"), 180);
    }, 3400);
  }
})();
