export class DepartmentList {
  constructor($module) {
    this.$module = $module;
    this.$rows =
      $module && $module.querySelectorAll(".department-list__item");
    this.$count = $module && $module.querySelector(".department-list__count");
    this.$noResults =
      $module && $module.querySelector(".department-list__no-results");

    if (!this.$module || !this.$rows || !this.$rows.length) {
      return;
    }

    this.hiddenClass = "department-list__item--hidden";
    this.init();
  }

  init() {
    document.addEventListener("browse-filters:change", (event) =>
      this.filter(event.detail.selected),
    );
  }

  filter(selected) {
    const filters = selected || [];
    let visible = 0;

    this.$rows.forEach(($row) => {
      const subjects = ($row.getAttribute("data-subjects") || "").split("|");
      const match =
        filters.length === 0 ||
        filters.some((filter) => subjects.indexOf(filter) !== -1);
      $row.classList.toggle(this.hiddenClass, !match);
      if (match) {
        visible += 1;
      }
    });

    this.updateCount(visible);
  }

  updateCount(visible) {
    if (this.$count) {
      this.$count.textContent =
        visible + (visible === 1 ? " department" : " departments");
    }
    if (this.$noResults) {
      this.$noResults.hidden = visible !== 0;
    }
  }
}
