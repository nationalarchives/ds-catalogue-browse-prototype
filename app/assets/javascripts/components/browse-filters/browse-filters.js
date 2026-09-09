export class BrowseFilters {
  constructor($module) {
    this.$module = $module;
    this.$items =
      $module && $module.querySelectorAll(".tna-browse-filters__item");

    if (!this.$module || !this.$items || !this.$items.length) {
      return;
    }

    this.selectedClass = "tna-browse-filters__item--selected";
    this.init();
  }

  init() {
    this.$module.addEventListener("click", (event) => this.handleClick(event));
  }

  handleClick(event) {
    const $toggle = event.target.closest(".tna-browse-filters__toggle");
    const $remove = event.target.closest(".tna-browse-filters__remove");
    if (!$toggle && !$remove) {
      return;
    }

    const $item = event.target.closest(".tna-browse-filters__item");
    if (!$item) {
      return;
    }

    if ($remove) {
      $item.classList.remove(this.selectedClass);
    } else {
      $item.classList.toggle(this.selectedClass);
    }

    const $toggleButton = $item.querySelector(".tna-browse-filters__toggle");
    if ($toggleButton) {
      $toggleButton.setAttribute(
        "aria-pressed",
        $item.classList.contains(this.selectedClass) ? "true" : "false",
      );
    }
  }
}
