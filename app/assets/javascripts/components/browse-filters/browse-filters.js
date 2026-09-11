export class BrowseFilters {
  constructor($module) {
    this.$module = $module;
    this.$items =
      $module && $module.querySelectorAll(".browse-filters__item");

    if (!this.$module || !this.$items || !this.$items.length) {
      return;
    }

    this.selectedClass = "browse-filters__item--selected";
    this.init();
  }

  init() {
    this.$module.addEventListener("click", (event) => this.handleClick(event));
    window.addEventListener("popstate", () => this.syncFromUrl());
  }

  handleClick(event) {
    const $link = event.target.closest(".browse-filters__link");
    if (!$link || !this.$module.contains($link)) {
      return;
    }

    const $item = $link.closest(".browse-filters__item");
    if (!$item) {
      return;
    }

    event.preventDefault();
    $item.classList.toggle(this.selectedClass);
    this.applyState(true);
  }

  syncFromUrl() {
    const selected = this.getSelectedFromUrl();
    this.$items.forEach(($item) => {
      const slug = $item.getAttribute("data-filter");
      $item.classList.toggle(this.selectedClass, selected.indexOf(slug) !== -1);
    });
    this.applyState(false);
  }

  applyState(pushState) {
    const selected = this.getSelected();

    this.$items.forEach(($item) => {
      const isSelected = $item.classList.contains(this.selectedClass);
      const $state = $item.querySelector(".browse-filters__state");
      if ($state) {
        $state.textContent = isSelected ? ", remove filter" : "";
      }
      const $link = $item.querySelector(".browse-filters__link");
      const slug = $item.getAttribute("data-filter");
      if ($link && slug) {
        $link.setAttribute("href", this.buildUrl(this.toggle(selected, slug)));
      }
    });

    if (pushState) {
      window.history.pushState({}, "", this.buildUrl(selected));
    }

    this.$module.dispatchEvent(
      new CustomEvent("browse-filters:change", {
        detail: { selected: selected },
        bubbles: true,
      }),
    );
  }

  getSelected() {
    return [...this.$items]
      .filter(($item) => $item.classList.contains(this.selectedClass))
      .map(($item) => $item.getAttribute("data-filter"))
      .filter(Boolean);
  }

  getSelectedFromUrl() {
    return new URLSearchParams(window.location.search)
      .getAll("filter")
      .filter(Boolean);
  }

  toggle(selected, slug) {
    return selected.indexOf(slug) !== -1
      ? selected.filter((s) => s !== slug)
      : selected.concat(slug);
  }

  buildUrl(selected) {
    if (selected.length === 0) {
      return window.location.pathname;
    }
    const params = new URLSearchParams();
    selected.forEach((s) => params.append("filter", s));
    return window.location.pathname + "?" + params.toString();
  }
}
